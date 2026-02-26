import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REMINDER_QUEUE } from '../queue/queue.module';
import type { SetRemindersDto } from '@judien/shared';
import type { Queue } from 'bullmq';
import { DateTime } from 'luxon';

export const REMINDER_JOB = 'send-reminder';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REMINDER_QUEUE) private readonly queue: Queue,
  ) {}

  async getForEvent(eventId: string) {
    return this.prisma.reminderRule.findMany({ where: { eventId } });
  }

  async setForEvent(eventId: string, dto: SetRemindersDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    // Replace all rules for this event
    await this.prisma.reminderRule.deleteMany({ where: { eventId } });

    for (const rule of dto.rules) {
      await this.prisma.reminderRule.create({
        data: {
          eventId,
          offsetMinutes: rule.offsetMinutes,
          channels: rule.channels,
          enabled: rule.enabled,
        },
      });

      if (!rule.enabled) continue;

      // Schedule BullMQ job — delay = startAt - offsetMinutes - now
      const fireAt = DateTime.fromJSDate(event.startAt)
        .minus({ minutes: rule.offsetMinutes });
      const delayMs = fireAt.toMillis() - Date.now();

      if (delayMs > 0) {
        const jobId = `reminder:${eventId}:${rule.offsetMinutes}`;
        await this.queue.add(
          REMINDER_JOB,
          { eventId, offsetMinutes: rule.offsetMinutes, channels: rule.channels },
          {
            jobId, // idempotent – same jobId replaces any previous
            delay: delayMs,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }
    }

    return this.prisma.reminderRule.findMany({ where: { eventId } });
  }
}
