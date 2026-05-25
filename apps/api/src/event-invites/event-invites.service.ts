import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { CreateEventInviteDto, AcceptEventInviteDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class EventInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async getInviteInfo(token: string) {
    const invite = await this.prisma.eventInvite.findUnique({
      where: { token },
      include: { event: { select: { id: true, title_en: true, title_zh: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found or expired.');
    if (new Date() > invite.expiresAt) throw new BadRequestException('Invite has expired.');
    return { eventId: invite.event.id, title_en: invite.event.title_en, title_zh: invite.event.title_zh };
  }

  async createInvite(eventId: string, createdById: string) {
    // Verify event exists
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Expiry 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invite = await this.prisma.eventInvite.create({
      data: {
        eventId,
        token,
        expiresAt,
        createdById,
      },
    });

    return invite;
  }

  /**
   * Accept an invite using a token.
   * Creates a user if needed, updates their profile, and RSVPs them to the event.
   */
  async acceptInvite(token: string, dto: AcceptEventInviteDto) {
    // Find the invite
    const invite = await this.prisma.eventInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found or expired.');

    // Check if expired
    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite has expired.');
    }

    const event = await this.prisma.event.findUnique({ where: { id: invite.eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    // Find or create user — dedup across phone and email
    const lookupConditions: object[] = [];
    if (dto.phoneE164) lookupConditions.push({ phoneE164: dto.phoneE164 });
    if (dto.email) lookupConditions.push({ email: dto.email });

    let user = lookupConditions.length > 0
      ? await this.prisma.user.findFirst({ where: { OR: lookupConditions } })
      : null;

    if (!user) {
      const email = dto.email ?? `user_${randomBytes(8).toString('hex')}@invited.local`;
      const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          phoneE164: dto.phoneE164 ?? null,
          passwordHash,
          displayName: dto.displayName,
          isGuest: true,
          role: 'USER',
        },
      });
    } else {
      // Merge any missing identifiers onto the existing account
      const updates: Record<string, unknown> = {};
      if (dto.displayName && !user.displayName) updates.displayName = dto.displayName;
      if (dto.phoneE164 && !user.phoneE164) updates.phoneE164 = dto.phoneE164;
      if (
        dto.email &&
        (!user.email ||
          user.email.endsWith('@invited.local') ||
          user.email.endsWith('@guest.local'))
      ) {
        updates.email = dto.email;
      }
      if (Object.keys(updates).length > 0) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    // RSVP them as GOING
    const existingRsvp = await this.prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId: invite.eventId, userId: user.id } },
    });

    if (!existingRsvp) {
      await this.prisma.rSVP.create({
        data: { eventId: invite.eventId, userId: user.id, status: 'GOING' },
      });
    }

    // Track acceptance on the invite record
    await this.prisma.eventInvite.update({
      where: { id: invite.id },
      data: {
        acceptedByUserId: user.id,
        acceptedAt: new Date(),
        guestName: dto.displayName,
        guestEmail: dto.email ?? null,
        guestPhone: dto.phoneE164,
      },
    });

    return { user, eventId: invite.eventId };
  }

  /**
   * List invitees (accepted + pending) for an event
   */
  async getEventInvitees(eventId: string) {
    const invites = await this.prisma.eventInvite.findMany({
      where: { eventId },
      include: {
        acceptedBy: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((inv) => ({
      inviteId: inv.id,
      userId: inv.acceptedByUserId,
      displayName: inv.acceptedBy?.displayName ?? null,
      email: inv.acceptedBy?.email ?? null,
      guestName: inv.guestName,
      acceptedAt: inv.acceptedAt?.toISOString() ?? null,
      token: inv.token,
      expiresAt: inv.expiresAt.toISOString(),
    }));
  }

  /**
   * Get all invites for an event (admin/creator only)
   */
  async getEventInvites(eventId: string) {
    return this.prisma.eventInvite.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Invalidate/revoke an invite
   */
  async revokeInvite(inviteId: string) {
    return this.prisma.eventInvite.update({
      where: { id: inviteId },
      data: { expiresAt: new Date() },
    });
  }
}
