import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import type { CreateEventInviteDto, AcceptEventInviteDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class EventInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an invite link for an event.
   * Anyone can accept the link without being a registered user.
   */
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

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phoneE164: dto.phoneE164 },
    });

    if (!user) {
      // Create new user with a placeholder email if not provided
      const email = dto.email || `user_${randomBytes(8).toString('hex')}@invited.local`;
      // Generate a random password (user can reset via email if real email provided)
      const password = randomBytes(16).toString('hex');
      // Password will need to be hashed - but for invited users, they might not need it if using phone

      user = await this.prisma.user.create({
        data: {
          email,
          phoneE164: dto.phoneE164,
          passwordHash: password, // In real app, hash this. For now, placeholder.
          displayName: dto.displayName,
        },
      });
    } else {
      // Update existing user's display name if provided
      if (dto.displayName) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { displayName: dto.displayName },
        });
      }
      // Update email if provided and different
      if (dto.email && user.email !== dto.email) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { email: dto.email },
        });
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

    return { user, eventId: invite.eventId };
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
    // Set expiry to now
    return this.prisma.eventInvite.update({
      where: { id: inviteId },
      data: { expiresAt: new Date() },
    });
  }
}
