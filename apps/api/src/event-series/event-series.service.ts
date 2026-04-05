import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventSeriesDto, LinkEventToSeriesDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class EventSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventSeriesDto, user: User) {
    return this.prisma.eventSeries.create({
      data: {
        title_en: dto.title_en,
        title_zh: dto.title_zh,
        groupId: dto.groupId ?? null,
        createdById: user.id,
      },
    });
  }

  async findOne(id: string) {
    const series = await this.prisma.eventSeries.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: [{ partNumber: 'asc' }, { startAt: 'asc' }],
          include: {
            rsvps: { select: { status: true } },
            group: { select: { name: true } },
          },
        },
      },
    });
    if (!series) throw new NotFoundException('Series not found.');
    return series;
  }

  async listByGroup(groupId: string) {
    return this.prisma.eventSeries.findMany({
      where: { groupId },
      include: { events: { orderBy: [{ partNumber: 'asc' }, { startAt: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async linkEvent(eventId: string, dto: LinkEventToSeriesDto, user: User) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    const isAdmin = user.role === 'ADMIN';
    const isOwner = event.createdById === user.id;
    if (!isAdmin && !isOwner) throw new ForbiddenException('Only the event creator or admin can link to a series.');

    const series = await this.prisma.eventSeries.findUnique({ where: { id: dto.seriesId } });
    if (!series) throw new NotFoundException('Series not found.');

    return this.prisma.event.update({
      where: { id: eventId },
      data: { seriesId: dto.seriesId, partNumber: dto.partNumber },
    });
  }

  async unlinkEvent(eventId: string, user: User) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    const isAdmin = user.role === 'ADMIN';
    const isOwner = event.createdById === user.id;
    if (!isAdmin && !isOwner) throw new ForbiddenException('Only the event creator or admin can unlink from a series.');

    return this.prisma.event.update({
      where: { id: eventId },
      data: { seriesId: null, partNumber: null },
    });
  }
}
