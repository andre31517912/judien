import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventDto, UpdateEventDto, EventListQuery } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async list(query: EventListQuery, userId?: string) {
    const now = new Date();
    const scopeWhere =
      query.scope === 'future'
        ? { startAt: { gte: now } }
        : { startAt: { lt: now } };

    let visibilityWhere: Record<string, unknown>;
    if (query.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(query.groupId, userId);
      if (!canAccess) throw new ForbiddenException('You do not have access to this group.');
      visibilityWhere = { groupId: query.groupId };
    } else if (userId) {
      const acceptedMemberships = await this.prisma.groupMembership.findMany({
        where: { userId, status: 'ACCEPTED' },
        select: { groupId: true },
      });
      const groupIds = acceptedMemberships.map((m) => m.groupId);
      visibilityWhere = {
        OR: [
          { groupId: null },
          ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ],
      };
    } else {
      visibilityWhere = { groupId: null };
    }

    const where = {
      AND: [scopeWhere, visibilityWhere],
    };

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
          group: { select: { name: true } },
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
        groupName: event.group?.name ?? null,
        group: undefined,
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
        group: { select: { name: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) throw new ForbiddenException('You do not have access to this event.');
    }

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
      groupName: event.group?.name ?? null,
      group: undefined,
      rsvps: undefined,
      rsvpCounts: counts,
      myRsvp,
      createdByEmail: event.createdBy?.email ?? null,
      createdBy: undefined,
    };
  }

  async create(dto: CreateEventDto, creator: User) {
    if (dto.groupId) {
      const canManage = await this.groupsService.canManageGroupContent(dto.groupId, creator);
      if (!canManage) {
        throw new ForbiddenException('You do not have permission to create events for this group.');
      }
    } else if (creator.role !== 'ADMIN') {
      throw new ForbiddenException('Only platform admins can create global events.');
    }

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

  async update(id: string, dto: UpdateEventDto, actor?: User) {
    const event = await this.ensureExists(id);

    if (actor) {
      if (event.groupId) {
        const canManage = await this.groupsService.canManageGroupContent(event.groupId, actor);
        if (!canManage) {
          throw new ForbiddenException('You do not have permission to update this event.');
        }
      } else if (actor.role !== 'ADMIN') {
        throw new ForbiddenException('Only platform admins can update global events.');
      }
    }

    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async remove(id: string, actor?: User) {
    const event = await this.ensureExists(id);

    if (actor) {
      if (event.groupId) {
        const canManage = await this.groupsService.canManageGroupContent(event.groupId, actor);
        if (!canManage) {
          throw new ForbiddenException('You do not have permission to delete this event.');
        }
      } else if (actor.role !== 'ADMIN') {
        throw new ForbiddenException('Only platform admins can delete global events.');
      }
    }

    await this.prisma.event.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }
}
