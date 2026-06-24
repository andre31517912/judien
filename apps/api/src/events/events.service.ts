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
      const directGroupIds = acceptedMemberships.map((m) => m.groupId);
      // Also include events from ancestor groups (parent group events visible to child members)
      const ancestorIds = new Set<string>();
      for (const gid of directGroupIds) {
        for (const aid of await this.groupsService.getAncestorGroupIds(gid)) {
          ancestorIds.add(aid);
        }
      }
      const groupIds = [...new Set([...directGroupIds, ...ancestorIds])];
      visibilityWhere = {
        OR: [
          { groupId: null },
          ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ],
      };
    } else {
      visibilityWhere = { groupId: null };
    }

    const keywordWhere = query.q?.trim()
      ? { OR: [
          { title: { contains: query.q.trim(), mode: 'insensitive' as const } },
          { description: { contains: query.q.trim(), mode: 'insensitive' as const } },
        ] }
      : undefined;

    const where = {
      AND: [scopeWhere, visibilityWhere, ...(keywordWhere ? [keywordWhere] : [])],
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
        createdBy: { select: { email: true, displayName: true } },
        group: { select: { name: true } },
        shareLink: { select: { token: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) {
        const wasInvited = userId ? await this.prisma.notification.findFirst({
          where: { userId, eventId: id, type: 'EVENT_INVITE' },
        }) : null;
        if (!wasInvited) throw new ForbiddenException('You do not have access to this event.');
      }
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
            createdBy: { select: { email: true, displayName: true } },
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
    }
    // No groupId → personal event; any authenticated user may create one.

    const event = await this.prisma.event.create({
      data: {
        ...dto,
        endAt: dto.endAt ?? null,
        feeAmount: dto.feeAmount ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        createdById: creator.id,
      },
    });

    // Notify all accepted group members + descendant group members (except the creator)
    if (dto.groupId) {
      const directMembers = await this.prisma.groupMembership.findMany({
        where: { groupId: dto.groupId, status: 'ACCEPTED', userId: { not: creator.id } },
        select: { userId: true },
      });
      const directIds = new Set(directMembers.map((m) => m.userId));
      const descendantIds = await this.groupsService.getAllDescendantMemberUserIds(dto.groupId, creator.id);
      const allUserIds = [...directIds, ...descendantIds.filter((id) => !directIds.has(id))];
      if (allUserIds.length) {
        const dateStr = new Date(event.startAt).toLocaleDateString('en-US', { dateStyle: 'medium' });
        await this.notifications.createMany(
          allUserIds.map((userId) => ({
            userId,
            type: 'NEW_EVENT' as const,
            title: `New event: ${event.title}`,
            body: event.location ? `${dateStr} · ${event.location}` : dateStr,
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

    const updated = await this.prisma.event.update({ where: { id }, data: dto });

    // Notify all invited people whenever any update is saved
    if (actor) {
      const actorName = (actor as any).displayName ?? 'An organizer';
      const notif = (userId: string, extraFields?: Record<string, unknown>) => ({
        userId,
        type: 'EVENT_UPDATED' as const,
        title: `${actorName} updated "${updated.title}"`,
        body: `Event details have been updated. Tap to see what changed.`,
        actionUrl: `/events/${id}`,
        eventId: id,
        ...extraFields,
      });

      if (event.groupId) {
        const directMembers = await this.prisma.groupMembership.findMany({
          where: { groupId: event.groupId, status: 'ACCEPTED', userId: { not: actor.id } },
          select: { userId: true },
        });
        const directIds = new Set(directMembers.map((m) => m.userId));
        const descendantIds = await this.groupsService.getAllDescendantMemberUserIds(event.groupId, actor.id);
        const allUserIds = [...directIds, ...descendantIds.filter((id) => !directIds.has(id))];
        if (allUserIds.length) {
          await this.notifications.createMany(
            allUserIds.map((userId) => notif(userId, { groupId: event.groupId! })),
          );
        }
      } else {
        const [rsvps, invites] = await Promise.all([
          this.prisma.rSVP.findMany({ where: { eventId: id }, select: { userId: true } }),
          this.prisma.eventInvite.findMany({
            where: { eventId: id, acceptedByUserId: { not: null } },
            select: { acceptedByUserId: true },
          }),
        ]);
        const seen = new Set<string>([actor.id]);
        const recipientIds: string[] = [];
        for (const r of rsvps) {
          if (!seen.has(r.userId)) { seen.add(r.userId); recipientIds.push(r.userId); }
        }
        for (const inv of invites) {
          if (inv.acceptedByUserId && !seen.has(inv.acceptedByUserId)) {
            seen.add(inv.acceptedByUserId);
            recipientIds.push(inv.acceptedByUserId);
          }
        }
        if (recipientIds.length) {
          await this.notifications.createMany(recipientIds.map((userId) => notif(userId)));
        }
      }
    }

    return updated;
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

    // Notify GOING RSVPers before deleting so the data is still accessible
    if (event.groupId) {
      const goingRsvps = await this.prisma.rSVP.findMany({
        where: { eventId: id, status: 'GOING' },
        select: { userId: true },
      });
      const recipientIds = goingRsvps
        .map((r) => r.userId)
        .filter((uid) => uid !== actor?.id);
      if (recipientIds.length) {
        await this.notifications.createMany(
          recipientIds.map((userId) => ({
            userId,
            type: 'EVENT_CANCELLED' as const,
            title: `Event cancelled: ${event.title}`,
            body: `This event has been cancelled.`,
            groupId: event.groupId!,
          })),
        );
      }
    }

    await this.prisma.event.delete({ where: { id } });
  }

  async directInvite(eventId: string, identifier: string, actor: User) {
    const event = await this.ensureExists(eventId);

    const isCreatorOrAdmin = actor.role === 'ADMIN' || event.createdById === actor.id;
    if (!isCreatorOrAdmin) {
      throw new ForbiddenException('Only the event creator or platform admin can directly invite users.');
    }

    const normalizedIdentifier = identifier.trim();
    const isEmail = normalizedIdentifier.includes('@');
    const foundUser = await this.prisma.user.findFirst({
      where: isEmail
        ? { email: normalizedIdentifier.toLowerCase() }
        : { phoneE164: normalizedIdentifier },
      select: { id: true, displayName: true, email: true, phoneE164: true },
    });
    if (!foundUser) throw new NotFoundException('No user found with that email or phone number.');
    if (foundUser.id === actor.id) throw new ForbiddenException('You cannot invite yourself.');

    const existingRsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId: foundUser.id } },
    });
    if (existingRsvp) {
      return { userId: foundUser.id, displayName: foundUser.displayName, status: 'already_rsvpd' as const };
    }

    // Create EventInvite record to track direct invite (guestEmail = their email for pending tracking)
    if (foundUser.email) {
      const existing = await this.prisma.eventInvite.findFirst({
        where: { eventId, guestEmail: foundUser.email },
      });
      if (!existing) {
        await this.prisma.eventInvite.create({
          data: {
            eventId,
            token: randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            createdById: actor.id,
            guestEmail: foundUser.email,
            guestName: foundUser.displayName ?? '',
          },
        });
      }
    }

    await this.notifications.createMany([{
      userId: foundUser.id,
      type: 'EVENT_INVITE' as const,
      title: `You've been invited to ${event.title}`,
      body: 'You have been personally invited to this event. Tap to view details.',
      actionUrl: `/events/${eventId}`,
      eventId,
    }]);

    return { userId: foundUser.id, displayName: foundUser.displayName, status: 'invited' as const };
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

    const inputs = userIds.map((userId) => ({
      userId,
      type: 'EVENT_INVITE' as const,
      title: `You've been invited to ${event.title}`,
      body: `An admin has invited you to join this event. Tap to view details.`,
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
