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

    const [rsvps, guestRsvps, memberships] = await Promise.all([
      this.prisma.rSVP.findMany({
        where: { eventId },
        include: { user: { select: { email: true, displayName: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.guestRSVP.findMany({
        where: { eventId },
        orderBy: { updatedAt: 'asc' },
      }),
      event.groupId
        ? (this.prisma.groupMembership as any).findMany({
            where: { groupId: event.groupId, status: 'ACCEPTED' },
            select: { userId: true, groupNickname: true },
          }) as Promise<{ userId: string; groupNickname: string | null }[]>
        : Promise.resolve([] as { userId: string; groupNickname: string | null }[]),
    ]);

    const nicknameByUserId = new Map(memberships.map((m: { userId: string; groupNickname: string | null }) => [m.userId, m.groupNickname]));

    const groups: Record<'GOING' | 'NO', { handle: string; displayName: string | null; source: 'user' | 'guest' }[]> = {
      GOING: [],
      NO: [],
    };

    for (const r of rsvps) {
      const status = r.status as 'GOING' | 'NO';
      if (groups[status]) {
        const nickname = nicknameByUserId.get(r.userId) ?? null;
        groups[status].push({
          handle: this.maskIdentifier(r.user.email ?? ''),
          displayName: nickname ?? (r.user as any).displayName ?? null,
          source: 'user',
        });
      }
    }

    for (const r of guestRsvps) {
      const status = r.status as 'GOING' | 'NO';
      if (groups[status]) {
        groups[status].push({
          handle: this.maskIdentifier(r.guestEmail),
          displayName: r.guestName,
          source: 'guest',
        });
      }
    }

    return groups;
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
