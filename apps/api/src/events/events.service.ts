import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventDto, UpdateEventDto, EventListQuery } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { GroupsService } from '../groups/groups.service';
import { NotificationsService } from '../notifications/notifications.service';
import { randomBytes } from 'crypto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
    private readonly notifications: NotificationsService,
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
          guestRsvps: { select: { status: true } },
          group: { select: { name: true } },
          shareLink: { select: { token: true } },
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
      const counts = this.mergeRsvpCounts(event.rsvps, event.guestRsvps);
      return {
        ...event,
        groupName: event.group?.name ?? null,
        group: undefined,
        rsvps: undefined,
        guestRsvps: undefined,
        shareLink: undefined,
        shareToken: event.shareLink?.token ?? null,
        rsvpCounts: counts,
        myRsvp: myRsvpMap.get(event.id) ?? null,
        isPast: new Date(event.startAt) < new Date(),
      };
    });

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        rsvps: { select: { status: true } },
        guestRsvps: { select: { status: true } },
        createdBy: { select: { email: true } },
        group: { select: { name: true } },
        shareLink: { select: { token: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) throw new ForbiddenException('You do not have access to this event.');
    }

    const counts = this.mergeRsvpCounts(event.rsvps, event.guestRsvps);

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
      guestRsvps: undefined,
      shareLink: undefined,
      shareToken: event.shareLink?.token ?? null,
      rsvpCounts: counts,
      myRsvp,
      createdByName: event.createdBy?.displayName ?? null,
      createdBy: undefined,
      isPast: new Date(event.startAt) < new Date(),
    };
  }

  async createShareLink(eventId: string, actor: User) {
    const event = await this.ensureExists(eventId);

    if (new Date(event.startAt) < new Date()) {
      throw new ForbiddenException('Cannot create a share link for a past event.');
    }

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, actor.id);
      if (!canAccess) {
        throw new ForbiddenException('You do not have access to this event.');
      }
    }

    const existing = await this.prisma.eventShareLink.findUnique({ where: { eventId } });
    if (existing) return existing;

    return this.prisma.eventShareLink.create({
      data: {
        eventId,
        token: randomBytes(24).toString('hex'),
        createdById: actor.id,
      },
    });
  }

  async getByShareToken(token: string, userId?: string) {
    const link = await this.prisma.eventShareLink.findUnique({
      where: { token },
      include: {
        event: {
          include: {
            rsvps: { select: { status: true } },
            guestRsvps: { select: { status: true } },
            createdBy: { select: { email: true } },
            group: { select: { name: true } },
            shareLink: { select: { token: true } },
          },
        },
      },
    });
    if (!link) throw new NotFoundException('Share link not found.');

    const event = link.event;
    const counts = this.mergeRsvpCounts(event.rsvps, event.guestRsvps);

    let myRsvp: string | null = null;
    if (userId) {
      const rsvp = await this.prisma.rSVP.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
      });
      myRsvp = rsvp?.status ?? null;
    }

    return {
      ...event,
      groupName: event.group?.name ?? null,
      group: undefined,
      rsvps: undefined,
      guestRsvps: undefined,
      shareLink: undefined,
      shareToken: event.shareLink?.token ?? token,
      rsvpCounts: counts,
      myRsvp,
      createdByName: event.createdBy?.displayName ?? null,
      createdBy: undefined,
      isPast: new Date(event.startAt) < new Date(),
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

    const event = await this.prisma.event.create({
      data: {
        ...dto,
        endAt: dto.endAt ?? null,
        feeAmount: dto.feeAmount ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        createdById: creator.id,
      },
    });

    // Notify all accepted group members (except the creator) about the new event
    if (dto.groupId) {
      const members = await this.prisma.groupMembership.findMany({
        where: { groupId: dto.groupId, status: 'ACCEPTED', userId: { not: creator.id } },
        select: { userId: true },
      });
      if (members.length) {
        const title_en = event.title_en || event.title_zh;
        const title_zh = event.title_zh || event.title_en;
        await this.notifications.createMany(
          members.map(({ userId }) => ({
            userId,
            type: 'NEW_EVENT' as const,
            title_en: `New event: ${title_en}`,
            title_zh: `新活動：${title_zh}`,
            body_en: event.location_en
              ? `${new Date(event.startAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} · ${event.location_en}`
              : new Date(event.startAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
            body_zh: event.location_zh
              ? `${new Date(event.startAt).toLocaleDateString('zh-TW', { dateStyle: 'medium' })} · ${event.location_zh}`
              : new Date(event.startAt).toLocaleDateString('zh-TW', { dateStyle: 'medium' }),
            actionUrl: `/events/${event.id}`,
            groupId: dto.groupId,
            eventId: event.id,
          })),
        );
      }
    }

    return event;
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

  async inviteMembers(eventId: string, userIds: string[], actor: User) {
    const event = await this.ensureExists(eventId);

    // Only platform admin or group admin can send invites
    if (event.groupId) {
      const canManage = await this.groupsService.canManageGroupContent(event.groupId, actor);
      if (!canManage) throw new ForbiddenException('You do not have permission to invite members to this event.');
    } else if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only platform admins can invite members to global events.');
    }

    const title_en = event.title_en || event.title_zh;
    const title_zh = event.title_zh || event.title_en;

    const inputs = userIds.map((userId) => ({
      userId,
      type: 'EVENT_INVITE' as const,
      title_en: `You've been invited to ${title_en}`,
      title_zh: `您被邀請參加 ${title_zh}`,
      body_en: `An admin has invited you to join this event. Tap to view details.`,
      body_zh: `管理員邀請您參加此活動，點擊查看詳情。`,
      actionUrl: `/events/${eventId}`,
      eventId,
    }));

    await this.notifications.createMany(inputs);
    return { invited: userIds.length };
  }

  private async ensureExists(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  private mergeRsvpCounts(
    rsvps: Array<{ status: 'GOING' | 'NO' }>,
    guestRsvps: Array<{ status: 'GOING' | 'NO' }>,
  ) {
    const counts = { GOING: 0, NO: 0 };
    for (const r of rsvps) counts[r.status]++;
    for (const r of guestRsvps) counts[r.status]++;
    return counts;
  }
}
