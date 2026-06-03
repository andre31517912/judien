import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import type { BlastDto } from '@judien/shared';
import { getDict, t } from '@judien/shared';

@Injectable()
export class BlastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async send(eventId: string, dto: BlastDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    // Resolve audience
    let users: { id: string; email: string | null; lineUserId: string | null; preferredLanguage: string; muteEmail: boolean; muteLinePush: boolean }[] = [];

    if (dto.audience === 'rsvped') {
      const rsvps = await this.prisma.rSVP.findMany({
        where: { eventId },
        include: { user: true },
      });
      users = rsvps.map((r) => r.user);
    } else {
      // 'invited': users who accepted an EventInvite OR RSVPed
      const [rsvps, invites] = await Promise.all([
        this.prisma.rSVP.findMany({ where: { eventId }, include: { user: true } }),
        this.prisma.eventInvite.findMany({
          where: { eventId, acceptedByUserId: { not: null } },
          include: { acceptedBy: true },
        }),
      ]);
      const seen = new Set<string>();
      for (const r of rsvps) {
        if (!seen.has(r.user.id)) { seen.add(r.user.id); users.push(r.user); }
      }
      for (const inv of invites) {
        if (inv.acceptedBy && !seen.has(inv.acceptedBy.id)) {
          seen.add(inv.acceptedBy.id);
          users.push(inv.acceptedBy);
        }
      }
    }

    let sent = 0;
    for (const user of users) {
      const lang = (user.preferredLanguage === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
      const dict = getDict(lang);
      const message = lang === 'zh' ? dto.messageZh : dto.messageEn;
      const subject = t(dict.messages.blastSubject, {
        title: lang === 'zh' ? event.title_zh : event.title_en,
      });

      if (dto.channels.includes('EMAIL') && !user.muteEmail && user.email) {
        await this.messaging.sendEmail({
          userId: user.id,
          eventId,
          to: user.email,
          subject,
          text: message,
        });
      }

      // LINE blast disabled — re-enable when LINE Messaging API is active
      // if (dto.channels.includes('LINE') && !user.muteLinePush && user.lineUserId) {
      //   await this.messaging.sendLine({
      //     userId: user.id,
      //     eventId,
      //     to: user.lineUserId,
      //     text: message,
      //   });
      // }

      sent++;
    }

    return { sent };
  }
}
