import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RsvpDto, SharedEventRsvpDto, PlusOneDto } from '@judien/shared';
import { GroupsService } from '../groups/groups.service';
import { createHash } from 'crypto';

@Injectable()
export class RsvpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async upsert(eventId: string, userId: string, dto: RsvpDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (new Date(event.startAt) < new Date()) {
      throw new ForbiddenException('Cannot RSVP to a past event.');
    }

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) {
        const wasInvited = await this.prisma.notification.findFirst({
          where: { userId, eventId, type: 'EVENT_INVITE' },
        });
        if (!wasInvited) throw new ForbiddenException('You do not have access to RSVP for this event.');
      }
    }

    return this.prisma.rSVP.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status: dto.status, declineReason: dto.status === 'NO' ? (dto.declineReason ?? null) : null },
      update: { status: dto.status, declineReason: dto.status === 'NO' ? (dto.declineReason ?? null) : null },
    });
  }

  async remove(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) {
        const wasInvited = await this.prisma.notification.findFirst({
          where: { userId, eventId, type: 'EVENT_INVITE' },
        });
        if (!wasInvited) throw new ForbiddenException('You do not have access to this event.');
      }
    }

    await this.prisma.rSVP.deleteMany({ where: { eventId, userId } });
    return { removed: true };
  }

  async guests(eventId: string, userId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) {
        throw new ForbiddenException('You do not have access to this guest list.');
      }
    }

    // Determine if caller has admin access (event creator, platform admin, or group admin)
    let isCallerAdmin = false;
    if (userId) {
      const requestingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      isCallerAdmin = requestingUser?.role === 'ADMIN' || event.createdById === userId;
      if (!isCallerAdmin && event.groupId) {
        const adminMembership = await (this.prisma.groupMembership as any).findUnique({
          where: { groupId_userId: { groupId: event.groupId, userId } },
          select: { role: true, status: true },
        });
        isCallerAdmin = adminMembership?.status === 'ACCEPTED' && adminMembership?.role === 'GROUP_ADMIN';
      }
    }

    const [rsvps, guestRsvps, memberships] = await Promise.all([
      this.prisma.rSVP.findMany({
        where: { eventId },
        include: {
          user: { select: { email: true, displayName: true, phoneE164: true } },
          plusOnes: true,
        },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.guestRSVP.findMany({
        where: { eventId },
        orderBy: { updatedAt: 'asc' },
      }),
      event.groupId
        ? (this.prisma.groupMembership as any).findMany({
            where: { groupId: event.groupId, status: 'ACCEPTED' },
            select: { userId: true, groupNickname: true, user: { select: { id: true, displayName: true, email: true, phoneE164: true } } },
          }) as Promise<{ userId: string; groupNickname: string | null; user: { id: string; displayName: string | null; email: string | null; phoneE164: string | null } }[]>
        : Promise.resolve([] as { userId: string; groupNickname: string | null; user: { id: string; displayName: string | null; email: string | null; phoneE164: string | null } }[]),
    ]);

    const nicknameByUserId = new Map(memberships.map((m) => [m.userId, m.groupNickname]));

    const groups: Record<'GOING' | 'NO', { handle: string; displayName: string | null; email?: string; phone?: string; source: 'user' | 'guest'; checkedIn: boolean; userId?: string; guestRsvpId?: string }[]> = {
      GOING: [],
      NO: [],
    };

    // Collect extra guests (plus-ones from any RSVP) separately
    const extraGuests: { name: string; email?: string; phone?: string; relationship?: string; connectedInviteeName?: string; addedByName: string }[] = [];

    for (const r of rsvps) {
      const status = r.status as 'GOING' | 'NO';
      if (groups[status]) {
        const nickname = nicknameByUserId.get(r.userId) ?? null;
        const displayName = nickname ?? (r.user as any).displayName ?? null;
        const entry: typeof groups['GOING'][number] = {
          handle: isCallerAdmin ? (r.user.email ?? '') : this.maskIdentifier(r.user.email ?? ''),
          displayName,
          source: 'user',
          checkedIn: (r as any).checkedIn ?? false,
        };
        if (isCallerAdmin) {
          if (r.user.email) entry.email = r.user.email;
          if ((r.user as any).phoneE164) entry.phone = (r.user as any).phoneE164;
          entry.userId = r.userId;
        }
        groups[status].push(entry);

        // Collect plus-ones from ALL RSVPs (regardless of status) into separate bucket
        if ((r as any).plusOnes?.length) {
          for (const po of (r as any).plusOnes) {
            const extra: typeof extraGuests[number] = {
              name: po.name,
              addedByName: displayName ?? entry.handle,
              ...(po.relationship ? { relationship: po.relationship } : {}),
              ...(po.connectedInviteeName ? { connectedInviteeName: po.connectedInviteeName } : {}),
            };
            if (isCallerAdmin) {
              if (po.email) extra.email = po.email;
              if (po.phone) extra.phone = po.phone;
            }
            extraGuests.push(extra);
          }
        }
      }
    }

    // Also collect plus-ones added by users without an RSVP (addedByUserId set, rsvpId null)
    const directPlusOnes = await (this.prisma as any).rSVPPlusOne.findMany({
      where: { eventId, addedByUserId: { not: null }, rsvpId: null },
      include: { addedByUser: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    for (const po of directPlusOnes) {
      const adderName = po.addedByUser?.displayName ?? po.addedByUser?.email ?? 'Unknown';
      const extra: typeof extraGuests[number] = {
        name: po.name,
        addedByName: adderName,
        ...(po.relationship ? { relationship: po.relationship } : {}),
        ...(po.connectedInviteeName ? { connectedInviteeName: po.connectedInviteeName } : {}),
      };
      if (isCallerAdmin) {
        if (po.email) extra.email = po.email;
        if (po.phone) extra.phone = po.phone;
      }
      extraGuests.push(extra);
    }

    for (const r of guestRsvps) {
      const status = r.status as 'GOING' | 'NO';
      if (groups[status]) {
        const entry: typeof groups['GOING'][number] = {
          handle: isCallerAdmin ? r.guestEmail : this.maskIdentifier(r.guestEmail),
          displayName: r.guestName,
          source: 'guest',
          checkedIn: (r as any).checkedIn ?? false,
        };
        if (isCallerAdmin) entry.guestRsvpId = r.id;
        if (isCallerAdmin) {
          entry.email = r.guestEmail;
          entry.phone = r.guestPhone;
        }
        groups[status].push(entry);
      }
    }

    // Creator-added roster guests (rsvpId = null): always merged into INVITED
    const rosterGuests = await (this.prisma as any).rSVPPlusOne.findMany({
      where: { eventId, rsvpId: null },
      orderBy: { createdAt: 'asc' },
    });
    const rosterEntries = rosterGuests.map((g: any) => ({
      name: g.name,
      email: isCallerAdmin ? (g.email ?? null) : null,
      ...(isCallerAdmin && g.phone ? { phone: g.phone } : {}),
      ...(g.relationship ? { relationship: g.relationship } : {}),
    }));

    // INVITED bucket: for group events, all group members are considered invited
    let invited: { name: string; email: string | null; phone?: string | null }[] | undefined;
    if (event.groupId) {
      invited = [
        ...memberships.map((m) => ({
          name: m.groupNickname ?? m.user.displayName ?? '',
          email: isCallerAdmin ? (m.user.email ?? null) : null,
          ...(isCallerAdmin && m.user.phoneE164 ? { phone: m.user.phoneE164 } : {}),
        })),
        ...rosterEntries,
      ];
    }

    // PENDING bucket: members/invitees who haven't replied
    let pending: { handle: string; displayName: string | null; email?: string; phone?: string; source: 'user' | 'guest' }[] | undefined;
    if (event.groupId && userId) {
      const rsvpUserIds = new Set(rsvps.map((r) => r.userId));
      pending = memberships
        .filter((m) => !rsvpUserIds.has(m.userId))
        .map((m) => ({
          handle: isCallerAdmin ? (m.user.email ?? '') : this.maskIdentifier(m.user.email ?? ''),
          displayName: m.groupNickname ?? m.user.displayName ?? null,
          source: 'user' as const,
          ...(isCallerAdmin && m.user.email ? { email: m.user.email } : {}),
          ...(isCallerAdmin && m.user.phoneE164 ? { phone: m.user.phoneE164 } : {}),
        }));
    } else if (!event.groupId && userId) {
      const invites = await this.prisma.eventInvite.findMany({
        where: { eventId },
        include: { acceptedBy: { select: { id: true, displayName: true, email: true, phoneE164: true } } },
      });

      // INVITED bucket for normal events: show direct invites + creator-added roster guests
      const directInvites = invites.filter((inv) => inv.guestEmail && !inv.acceptedByUserId);
      const invitedFromInvites = directInvites.map((inv) => ({
        name: inv.guestName ?? inv.guestEmail ?? '',
        email: isCallerAdmin ? (inv.guestEmail ?? null) : null,
        ...(isCallerAdmin && inv.guestPhone ? { phone: inv.guestPhone } : {}),
      }));
      const combined = [...invitedFromInvites, ...rosterEntries];
      if (combined.length > 0) {
        invited = combined;
      }

      const rsvpUserIds = new Set(rsvps.map((r) => r.userId));
      const rsvpUserEmails = new Set(
        rsvps.filter((r) => r.user.email).map((r) => r.user.email!.toLowerCase())
      );
      const guestRsvpEmails = new Set(guestRsvps.map((r) => r.guestEmail.toLowerCase()));

      pending = [];
      for (const inv of invites) {
        if (inv.acceptedByUserId && !rsvpUserIds.has(inv.acceptedByUserId)) {
          const entry: typeof pending[number] = {
            handle: isCallerAdmin ? (inv.acceptedBy?.email ?? '') : this.maskIdentifier(inv.acceptedBy?.email ?? ''),
            displayName: inv.acceptedBy?.displayName ?? null,
            source: 'user' as const,
          };
          if (isCallerAdmin && inv.acceptedBy?.email) entry.email = inv.acceptedBy.email;
          if (isCallerAdmin && (inv.acceptedBy as any)?.phoneE164) entry.phone = (inv.acceptedBy as any).phoneE164;
          pending.push(entry);
        } else if (!inv.acceptedByUserId && inv.guestEmail) {
          const emailLower = inv.guestEmail.toLowerCase();
          if (!guestRsvpEmails.has(emailLower) && !rsvpUserEmails.has(emailLower)) {
            const entry: typeof pending[number] = {
              handle: isCallerAdmin ? inv.guestEmail : this.maskIdentifier(inv.guestEmail),
              displayName: inv.guestName ?? null,
              source: 'guest' as const,
            };
            if (isCallerAdmin) {
              entry.email = inv.guestEmail;
              if (inv.guestPhone) entry.phone = inv.guestPhone;
            }
            pending.push(entry);
          }
        }
      }
    }

    return {
      ...groups,
      ...(invited !== undefined ? { INVITED: invited } : {}),
      ...(pending !== undefined ? { PENDING: pending } : {}),
      EXTRA_GUESTS: extraGuests,
    };
  }

  async guestsByShareToken(token: string, userId?: string) {
    const link = await this.prisma.eventShareLink.findUnique({
      where: { token },
      select: { eventId: true },
    });
    if (!link) throw new NotFoundException('Share link not found.');
    return this.guests(link.eventId, userId);
  }

  async upsertFromShareLink(
    token: string,
    userId: string | undefined,
    dto: SharedEventRsvpDto,
    meta: { ipAddress: string | null; userAgent: string | null },
  ) {
    const link = await this.prisma.eventShareLink.findUnique({
      where: { token },
      select: { eventId: true },
    });
    if (!link) throw new NotFoundException('Share link not found.');

    if (userId) {
      return this.upsert(link.eventId, userId, { status: dto.status });
    }

    if (!dto.guest) {
      throw new ForbiddenException('Guest details are required for public RSVP.');
    }

    const normalizedEmail = dto.guest.email.trim().toLowerCase();
    const normalizedPhone = dto.guest.phoneE164.trim();
    const normalizedName = dto.guest.name.trim().toLowerCase();
    const identityHash = createHash('sha256')
      .update(`${normalizedEmail}|${normalizedPhone}|${normalizedName}`)
      .digest('hex');

    return this.prisma.guestRSVP.upsert({
      where: {
        eventId_identityHash: {
          eventId: link.eventId,
          identityHash,
        },
      },
      create: {
        eventId: link.eventId,
        guestName: dto.guest.name.trim(),
        guestEmail: normalizedEmail,
        guestPhone: normalizedPhone,
        identityHash,
        status: dto.status,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      update: {
        guestName: dto.guest.name.trim(),
        guestEmail: normalizedEmail,
        guestPhone: normalizedPhone,
        status: dto.status,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  }

  private async canManageEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN' || event.createdById === userId) return event;
    if (event.groupId) {
      const m = await (this.prisma.groupMembership as any).findUnique({
        where: { groupId_userId: { groupId: event.groupId, userId } },
        select: { role: true, status: true },
      });
      if (m?.status === 'ACCEPTED' && m?.role === 'GROUP_ADMIN') return event;
    }
    throw new ForbiddenException('Only the event creator or admin can manage this event\'s roster.');
  }

  async getRosterGuests(eventId: string, userId: string) {
    await this.canManageEvent(eventId, userId);
    return (this.prisma as any).rSVPPlusOne.findMany({
      where: { eventId, rsvpId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addRosterGuest(eventId: string, userId: string, dto: PlusOneDto) {
    await this.canManageEvent(eventId, userId);
    return (this.prisma as any).rSVPPlusOne.create({
      data: {
        rsvpId: null,
        eventId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        relationship: dto.relationship ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async removeRosterGuest(eventId: string, userId: string, guestId: string) {
    await this.canManageEvent(eventId, userId);
    const guest = await (this.prisma as any).rSVPPlusOne.findUnique({ where: { id: guestId } });
    if (!guest || guest.eventId !== eventId || guest.rsvpId !== null) throw new NotFoundException('Roster guest not found.');
    await (this.prisma as any).rSVPPlusOne.delete({ where: { id: guestId } });
    return { removed: true };
  }

  async getMyPlusOnes(eventId: string, userId: string) {
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
    return (this.prisma as any).rSVPPlusOne.findMany({
      where: {
        eventId,
        OR: [
          ...(rsvp ? [{ rsvpId: rsvp.id }] : []),
          { addedByUserId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addPlusOne(eventId: string, userId: string, dto: PlusOneDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (new Date(event.startAt) < new Date()) {
      throw new ForbiddenException('Cannot add a guest to a past event.');
    }

    // Check user has access to this event
    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) {
        const wasInvited = await this.prisma.notification.findFirst({
          where: { userId, eventId, type: 'EVENT_INVITE' },
        });
        if (!wasInvited) throw new ForbiddenException('You do not have access to this event.');
      }
    }

    // Find existing RSVP (any status)
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, status: true },
    });

    // Count guests this user has already added
    const existing = await (this.prisma as any).rSVPPlusOne.count({
      where: {
        eventId,
        OR: [
          ...(rsvp ? [{ rsvpId: rsvp.id }] : []),
          { addedByUserId: userId },
        ],
      },
    });
    if (existing >= 10) {
      throw new ForbiddenException('Maximum of 10 guests allowed per user.');
    }

    // Link to RSVP if user is GOING; otherwise track via addedByUserId
    const useRsvp = rsvp?.status === 'GOING';

    return (this.prisma as any).rSVPPlusOne.create({
      data: {
        rsvpId: useRsvp ? rsvp!.id : null,
        addedByUserId: useRsvp ? null : userId,
        eventId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        relationship: dto.relationship ?? null,
        connectedInviteeName: dto.connectedInviteeName ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async removePlusOne(eventId: string, userId: string, plusOneId: string) {
    const plusOne = await (this.prisma as any).rSVPPlusOne.findUnique({
      where: { id: plusOneId },
      select: { id: true, rsvpId: true, addedByUserId: true, eventId: true },
    });
    if (!plusOne || plusOne.eventId !== eventId) {
      throw new NotFoundException('Guest not found.');
    }

    // Check ownership: via RSVP or via addedByUserId
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
    const isOwner = (rsvp && plusOne.rsvpId === rsvp.id) || plusOne.addedByUserId === userId;
    if (!isOwner) {
      // Also allow event admin
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      const isAdmin = user?.role === 'ADMIN' || event?.createdById === userId;
      if (!isAdmin) throw new ForbiddenException('You cannot remove this guest.');
    }

    await (this.prisma as any).rSVPPlusOne.delete({ where: { id: plusOneId } });
    return { removed: true };
  }

  async updateTransportation(eventId: string, userId: string, method: string) {
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, status: true },
    });
    if (!rsvp || rsvp.status !== 'GOING') {
      throw new ForbiddenException('You must be RSVPed as Going to set a transportation method.');
    }
    return (this.prisma.rSVP as any).update({
      where: { id: rsvp.id },
      data: { transportationMethod: method },
    });
  }

  async joinSubEvent(eventId: string, userId: string, subEventId: string) {
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    if (!rsvp || rsvp.status !== 'GOING') {
      throw new ForbiddenException('You must be RSVPed as Going to join a sub-event.');
    }

    const subEvent = await (this.prisma as any).subEvent.findUnique({
      where: { id: subEventId },
      include: { _count: { select: { rsvps: true } } },
    });
    if (!subEvent || subEvent.parentEventId !== eventId) {
      throw new NotFoundException('Sub-event not found.');
    }
    if (subEvent.maxCapacity && subEvent._count.rsvps >= subEvent.maxCapacity) {
      throw new ForbiddenException('This activity is at capacity.');
    }

    return (this.prisma as any).subEventRSVP.upsert({
      where: { subEventId_userId: { subEventId, userId } },
      create: { subEventId, userId },
      update: {},
    });
  }

  async leaveSubEvent(eventId: string, userId: string, subEventId: string) {
    const subEvent = await (this.prisma as any).subEvent.findUnique({
      where: { id: subEventId },
      select: { parentEventId: true },
    });
    if (!subEvent || subEvent.parentEventId !== eventId) {
      throw new NotFoundException('Sub-event not found.');
    }

    await (this.prisma as any).subEventRSVP.deleteMany({
      where: { subEventId, userId },
    });
    return { left: true };
  }

  private async assertEventAdmin(eventId: string, callerUserId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { createdById: true, groupId: true } });
    if (!event) throw new NotFoundException('Event not found.');
    const caller = await this.prisma.user.findUnique({ where: { id: callerUserId }, select: { role: true } });
    let isAdmin = caller?.role === 'ADMIN' || event.createdById === callerUserId;
    if (!isAdmin && event.groupId) {
      const membership = await (this.prisma.groupMembership as any).findUnique({
        where: { groupId_userId: { groupId: event.groupId, userId: callerUserId } },
        select: { role: true, status: true },
      });
      isAdmin = membership?.status === 'ACCEPTED' && membership?.role === 'GROUP_ADMIN';
    }
    if (!isAdmin) throw new ForbiddenException('Only event admins can perform this action.');
  }

  async checkIn(eventId: string, callerUserId: string, targetUserId: string, checkedIn: boolean) {
    await this.assertEventAdmin(eventId, callerUserId);
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId: targetUserId } },
      select: { id: true, status: true },
    });
    if (!rsvp) throw new NotFoundException('RSVP not found.');
    return (this.prisma.rSVP as any).update({
      where: { id: rsvp.id },
      data: { checkedIn, checkedInAt: checkedIn ? new Date() : null },
      select: { id: true, checkedIn: true, checkedInAt: true },
    });
  }

  async checkInGuest(eventId: string, callerUserId: string, guestRsvpId: string, checkedIn: boolean) {
    await this.assertEventAdmin(eventId, callerUserId);
    const guestRsvp = await this.prisma.guestRSVP.findFirst({ where: { id: guestRsvpId, eventId } });
    if (!guestRsvp) throw new NotFoundException('Guest RSVP not found.');
    return (this.prisma.guestRSVP as any).update({
      where: { id: guestRsvpId },
      data: { checkedIn, checkedInAt: checkedIn ? new Date() : null },
      select: { id: true, checkedIn: true, checkedInAt: true },
    });
  }

  private maskIdentifier(value: string) {
    if (!value) return '***';
    if (value.includes('@')) {
      const [name, domain] = value.split('@');
      const visible = name.slice(0, 2);
      return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
    }
    return `${value.slice(0, 3)}***`;
  }

  async exportRsvps(eventId: string, requestingUserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    const requestingUser = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
    const isAdmin = requestingUser?.role === 'ADMIN';
    const isCreator = event.createdById === requestingUserId;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only admins or the event creator can export RSVP data.');
    }

    const [rsvps, guestRsvps, exportMemberships] = await Promise.all([
      this.prisma.rSVP.findMany({
        where: { eventId },
        include: { user: { select: { email: true, displayName: true } } },
        orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }],
      }),
      this.prisma.guestRSVP.findMany({
        where: { eventId },
        orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }],
      }),
      event.groupId
        ? (this.prisma.groupMembership as any).findMany({
            where: { groupId: event.groupId, status: 'ACCEPTED' },
            select: { userId: true, groupNickname: true },
          }) as Promise<{ userId: string; groupNickname: string | null }[]>
        : Promise.resolve([] as { userId: string; groupNickname: string | null }[]),
    ]);

    const exportNicknameByUserId = new Map(exportMemberships.map((m: { userId: string; groupNickname: string | null }) => [m.userId, m.groupNickname]));

    const rows: { name: string; email: string | null; type: string; status: string; declineReason: string }[] = [];

    for (const r of rsvps) {
      const nickname = exportNicknameByUserId.get(r.userId) ?? null;
      rows.push({
        name: nickname ?? (r.user as any).displayName ?? '',
        email: r.user.email,
        type: 'member',
        status: r.status,
        declineReason: r.status === 'NO' ? ((r as any).declineReason ?? '') : '',
      });
    }

    for (const r of guestRsvps) {
      rows.push({
        name: r.guestName,
        email: r.guestEmail,
        type: 'guest',
        status: r.status,
        declineReason: '',
      });
    }

    return { eventTitle: event.title, rows };
  }
}
