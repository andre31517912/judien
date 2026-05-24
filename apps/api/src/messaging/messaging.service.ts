import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MessagingAdapter, SendLineOptions } from './messaging.interface';
import type { MessageChannel } from '@judien/shared';

export const MESSAGING_ADAPTER = 'MESSAGING_ADAPTER';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_ADAPTER) private readonly adapter: MessagingAdapter,
  ) {}

  async sendSms(opts: {
    userId: string;
    eventId?: string;
    to: string;
    body: string;
  }): Promise<void> {
    const log = await this.prisma.messageLog.create({
      data: {
        userId: opts.userId,
        eventId: opts.eventId ?? null,
        channel: 'SMS' satisfies MessageChannel,
        toAddress: opts.to,
        payload: { body: opts.body },
        status: 'PENDING',
      },
    });

    const providerId = await this.adapter.sendSms({ to: opts.to, body: opts.body });

    await this.prisma.messageLog.update({
      where: { id: log.id },
      data: {
        status: providerId ? 'SENT' : 'FAILED',
        providerMessageId: providerId ?? null,
      },
    });
  }

  async sendEmail(opts: {
    userId: string;
    eventId?: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const log = await this.prisma.messageLog.create({
      data: {
        userId: opts.userId,
        eventId: opts.eventId ?? null,
        channel: 'EMAIL' satisfies MessageChannel,
        toAddress: opts.to,
        payload: { subject: opts.subject, text: opts.text },
        status: 'PENDING',
      },
    });

    const providerId = await this.adapter.sendEmail({
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });

    await this.prisma.messageLog.update({
      where: { id: log.id },
      data: {
        status: providerId ? 'SENT' : 'FAILED',
        providerMessageId: providerId ?? null,
      },
    });
  }

  async sendLine(opts: {
    userId: string;
    eventId?: string;
    to: string;
    text: string;
  }): Promise<void> {
    const log = await this.prisma.messageLog.create({
      data: {
        userId: opts.userId,
        eventId: opts.eventId ?? null,
        channel: 'LINE' satisfies MessageChannel,
        toAddress: opts.to,
        payload: { text: opts.text },
        status: 'PENDING',
      },
    });

    const providerId = await this.adapter.sendLine?.({ to: opts.to, text: opts.text }) ?? null;

    await this.prisma.messageLog.update({
      where: { id: log.id },
      data: {
        status: providerId ? 'SENT' : 'FAILED',
        providerMessageId: providerId ?? null,
      },
    });
  }
}
