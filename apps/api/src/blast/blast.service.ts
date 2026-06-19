import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { BlastDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

type RecipientUser = {
  id: string;
  email: string | null;
  lineUserId: string | null;
  preferredLanguage: string;
  muteEmail: boolean;
  muteLinePush: boolean;
};

@Injectable()
export class BlastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
  ) {}

  async send(eventId: string, dto: BlastDto, actor: User) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    // Permission: platform admin, event creator, or group admin
    const isAdmin = actor.role === 'ADMIN';
    const isCreator = event.createdById === actor.id;
    let isGroupAdmin = false;
    if (!isAdmin && !isCreator && event.groupId) {
      const membership = await (this.prisma.groupMembership as any).findUnique({
        where: { groupId_userId: { groupId: event.groupId, userId: actor.id } },
        select: { role: true, status: true },
      });
      isGroupAdmin = membership?.status === 'ACCEPTED' && membership?.role === 'GROUP_ADMIN';
    }
    if (!isAdmin && !isCreator && !isGroupAdmin) {
      throw new ForbiddenException('Only the event creator, group admin, or platform admin can send blasts.');
    }

    // Resolve recipients
    let users: RecipientUser[] = [];

    if (dto.audience === 'rsvped') {
      const rsvps = await this.prisma.rSVP.findMany({
        where: { eventId, status: 'GOING' },
        include: { user: true },
      });
      users = rsvps.map((r) => r.user as RecipientUser);
    } else {
      // 'invited': for group events → all accepted group members; for non-group → RSVPers + invite acceptors
      if (event.groupId) {
        const members = await (this.prisma.groupMembership as any).findMany({
          where: { groupId: event.groupId, status: 'ACCEPTED' },
          include: { user: true },
        }) as { user: RecipientUser }[];
        users = members.map((m) => m.user);
      } else {
        const [rsvps, invites] = await Promise.all([
          this.prisma.rSVP.findMany({ where: { eventId }, include: { user: true } }),
          this.prisma.eventInvite.findMany({
            where: { eventId, acceptedByUserId: { not: null } },
            include: { acceptedBy: true },
          }),
        ]);
        const seen = new Set<string>();
        for (const r of rsvps) {
          if (!seen.has(r.user.id)) { seen.add(r.user.id); users.push(r.user as RecipientUser); }
        }
        for (const inv of invites) {
          if (inv.acceptedBy && !seen.has(inv.acceptedBy.id)) {
            seen.add(inv.acceptedBy.id);
            users.push(inv.acceptedBy as RecipientUser);
          }
        }
      }
    }

    // Exclude the sender themselves
    users = users.filter((u) => u.id !== actor.id);

    let sent = 0;

    for (const user of users) {
      let delivered = false;

      if (dto.channels.includes('EMAIL') && !user.muteEmail && user.email) {
        await this.messaging.sendEmail({
          userId: user.id,
          eventId,
          to: user.email,
          subject: `Message about: ${event.title}`,
          text: dto.message,
        });
        delivered = true;
      }

      // LINE blast disabled until LINE Messaging API is configured
      // if (dto.channels.includes('LINE') && !user.muteLinePush && user.lineUserId) {
      //   await this.messaging.sendLine({ userId: user.id, eventId, to: user.lineUserId, text: dto.message });
      //   delivered = true;
      // }

      if (delivered) sent++;
    }

    // In-app notifications only when IN_APP channel is selected
    if (dto.channels.includes('IN_APP') && users.length) {
      await this.notifications.createMany(
        users.map((user) => ({
          userId: user.id,
          type: 'EVENT_BLAST' as const,
          title: `Message from ${event.title}`,
          body: dto.message,
          actionUrl: `/events/${eventId}`,
          eventId,
        })),
      );
      sent = Math.max(sent, users.length);
    }

    return { sent };
  }
}
