import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventDto, UpdateEventDto, EventListQuery } from '@judien/shared';
import type { User } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EventListQuery, userId?: string) {
    const now = new Date();
    const where =
      query.scope === 'future'
        ? { startAt: { gte: now } }
        : { startAt: { lt: now } };

    const orderBy =
      query.scope === 'future'
        ? { startAt: 'asc' as const }
        : { startAt: 'desc' as const };

    const skip = (query.page - 1) * query.pageSize;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: {
          rsvps: { select: { status: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const myRsvps = userId
      ? await this.prisma.rSVP.findMany({
          where: { userId, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true, status: true },
        })
      : [];

    const myRsvpMap = new Map(myRsvps.map((r) => [r.eventId, r.status]));

    const data = events.map((event) => {
      const counts = { GOING: 0, MAYBE: 0, NO: 0 };
      for (const r of event.rsvps) counts[r.status]++;
      return {
        ...event,
        rsvps: undefined,
        rsvpCounts: counts,
        myRsvp: myRsvpMap.get(event.id) ?? null,
      };
    });

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        rsvps: { select: { status: true } },
        createdBy: { select: { email: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found.');

    const counts = { GOING: 0, MAYBE: 0, NO: 0 };
    for (const r of event.rsvps) counts[r.status]++;

    let myRsvp: string | null = null;
    if (userId) {
      const rsvp = await this.prisma.rSVP.findUnique({
        where: { eventId_userId: { eventId: id, userId } },
      });
      myRsvp = rsvp?.status ?? null;
    }

    return {
      ...event,
      rsvps: undefined,
      rsvpCounts: counts,
      myRsvp,
      createdByEmail: event.createdBy?.email ?? null,
      createdBy: undefined,
    };
  }

  async create(dto: CreateEventDto, creator: User) {
    return this.prisma.event.create({
      data: {
        ...dto,
        endAt: dto.endAt ?? null,
        feeAmount: dto.feeAmount ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        createdById: creator.id,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.ensureExists(id);
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.event.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }
}
