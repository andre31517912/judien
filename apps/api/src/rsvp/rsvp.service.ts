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

    if (event.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(event.groupId, userId);
      if (!canAccess) {
        throw new ForbiddenException('You do not have access to RSVP for this event.');
      }
    }

    return this.prisma.rSVP.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status: dto.status },
      update: { status: dto.status },
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

    const [rsvps, guestRsvps] = await Promise.all([
      this.prisma.rSVP.findMany({
        where: { eventId },
        include: { user: { select: { email: true, displayName: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.guestRSVP.findMany({
        where: { eventId },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    const groups: Record<'GOING' | 'MAYBE' | 'NO', { handle: string; displayName: string | null; source: 'user' | 'guest' }[]> = {
      GOING: [],
      MAYBE: [],
      NO: [],
    };

    for (const r of rsvps) {
      const status = r.status as 'GOING' | 'MAYBE' | 'NO';
      if (groups[status]) {
        groups[status].push({
          handle: this.maskIdentifier(r.user.email),
          displayName: (r.user as any).displayName ?? null,
          source: 'user',
        });
      }
    }

    for (const r of guestRsvps) {
      const status = r.status as 'GOING' | 'MAYBE' | 'NO';
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
}
