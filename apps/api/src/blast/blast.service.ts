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
    let users: { id: string; email: string; phoneE164: string; preferredLanguage: string; notificationsMuted: boolean }[] = [];

    if (dto.audience === 'rsvped') {
      const rsvps = await this.prisma.rSVP.findMany({
        where: { eventId },
        include: { user: true },
      });
      users = rsvps.map((r) => r.user);
    } else {
      users = await this.prisma.user.findMany();
    }

    // Filter muted users
    users = users.filter((u) => !u.notificationsMuted);

    let sent = 0;
    for (const user of users) {
      const lang = (user.preferredLanguage === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
      const dict = getDict(lang);
      const message = lang === 'zh' ? dto.messageZh : dto.messageEn;
      const subject = t(dict.messages.blastSubject, {
        title: lang === 'zh' ? event.title_zh : event.title_en,
      });

      if (dto.channels.includes('EMAIL')) {
        await this.messaging.sendEmail({
          userId: user.id,
          eventId,
          to: user.email,
          subject,
          text: message,
        });
      }

      if (dto.channels.includes('SMS')) {
        await this.messaging.sendSms({
          userId: user.id,
          eventId,
          to: user.phoneE164,
          body: message,
        });
      }

      sent++;
    }

    return { sent };
  }
}
