import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RsvpDto, SharedEventRsvpDto } from '@judien/shared';
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
        throw new ForbiddenException('You do not have access to RSVP for this event.');
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
        throw new ForbiddenException('You do not have access to this event.');
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
        include: { user: { select: { email: true, displayName: true, phoneE164: true } } },
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

    const groups: Record<'GOING' | 'NO', { handle: string; displayName: string | null; email?: string; phone?: string; source: 'user' | 'guest' }[]> = {
      GOING: [],
      NO: [],
    };

    for (const r of rsvps) {
      const status = r.status as 'GOING' | 'NO';
      if (groups[status]) {
        const nickname = nicknameByUserId.get(r.userId) ?? null;
        const entry: typeof groups['GOING'][number] = {
          handle: isCallerAdmin ? (r.user.email ?? '') : this.maskIdentifier(r.user.email ?? ''),
          displayName: nickname ?? (r.user as any).displayName ?? null,
          source: 'user',
        };
        if (isCallerAdmin) {
          if (r.user.email) entry.email = r.user.email;
          if ((r.user as any).phoneE164) entry.phone = (r.user as any).phoneE164;
        }
        groups[status].push(entry);
      }
    }

    for (const r of guestRsvps) {
      const status = r.status as 'GOING' | 'NO';
      if (groups[status]) {
        const entry: typeof groups['GOING'][number] = {
          handle: isCallerAdmin ? r.guestEmail : this.maskIdentifier(r.guestEmail),
          displayName: r.guestName,
          source: 'guest',
        };
        if (isCallerAdmin) {
          entry.email = r.guestEmail;
          entry.phone = r.guestPhone;
        }
        groups[status].push(entry);
      }
    }

    // INVITED bucket: for group events, all group members are considered invited
    let invited: { name: string; email: string | null; phone?: string | null }[] | undefined;
    if (event.groupId) {
      invited = memberships.map((m) => ({
        name: m.groupNickname ?? m.user.displayName ?? '',
        email: isCallerAdmin ? (m.user.email ?? null) : null,
        ...(isCallerAdmin && m.user.phoneE164 ? { phone: m.user.phoneE164 } : {}),
      }));
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

      // INVITED bucket for normal events: show direct invites (created with guestEmail set)
      const directInvites = invites.filter((inv) => inv.guestEmail && !inv.acceptedByUserId);
      if (directInvites.length > 0) {
        invited = directInvites.map((inv) => ({
          name: inv.guestName ?? inv.guestEmail ?? '',
          email: isCallerAdmin ? (inv.guestEmail ?? null) : null,
          ...(isCallerAdmin && inv.guestPhone ? { phone: inv.guestPhone } : {}),
        }));
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

    return { eventTitle: event.title_en || event.title_zh, rows };
  }
}
