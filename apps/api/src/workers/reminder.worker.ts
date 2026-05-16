/**
 * Reminder Worker — runs as a separate process: `pnpm queue:worker`
 *
 * Consumes jobs from BullMQ "reminders" queue,
 * looks up the event + RSVP'd users, and sends SMS/email.
 *
 * Design notes:
 *  - jobId is `reminder:${eventId}:${offsetMinutes}` → idempotent re-schedules
 *  - Retries up to 3× with exponential back-off (set in RemindersService)
 *  - MockMessagingAdapter used when MOCK_MODE=true
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { Worker, type Job } from 'bullmq';
import { PrismaClient } from '../__generated__/prisma';
import { MockMessagingAdapter } from '../messaging/mock.adapter';
import { ProductionMessagingAdapter } from '../messaging/production.adapter';
import { REMINDER_QUEUE_NAME } from '../queue/queue.module';
import { REMINDER_JOB } from '../reminders/reminders.service';
import { getDict, t } from '@judien/shared';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

const isMock = process.env.MOCK_MODE === 'true';
const adapter = isMock ? new MockMessagingAdapter() : new ProductionMessagingAdapter();

interface ReminderJobData {
  eventId: string;
  offsetMinutes: number;
  channels: ('SMS' | 'EMAIL')[];
}

async function processReminder(job: Job<ReminderJobData>) {
  const { eventId, offsetMinutes, channels } = job.data;

  console.log(`[worker] Processing reminder job=${job.id} event=${eventId} offset=${offsetMinutes}min`);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    console.warn(`[worker] Event ${eventId} not found; skipping.`);
    return;
  }

  // Fetch RSVP'd users
  const rsvps = await prisma.rSVP.findMany({
    where: { eventId },
    include: { user: true },
  });

  const users = rsvps.map((r) => r.user);

  for (const user of users) {
    const lang = (user.preferredLanguage === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
    const dict = getDict(lang);

    const title = lang === 'zh' ? event.title_zh : event.title_en;
    const startDt = DateTime.fromJSDate(event.startAt).setZone(event.timezone);
    const dateStr = startDt.toFormat('yyyy-MM-dd');
    const timeStr = startDt.toFormat('HH:mm');

    const body = t(dict.messages.reminderBody, {
      title,
      date: dateStr,
      time: timeStr,
      timezone: event.timezone,
    });
    const subject = t(dict.messages.reminderSubject, { title });

    // Log to DB then send — skip per-channel if user has muted that channel
    for (const channel of channels) {
      if (channel === 'SMS' && user.muteSms) continue;
      if (channel === 'SMS' && !user.phoneE164) continue;
      if (channel === 'EMAIL' && user.muteEmail) continue;
      const toAddress = channel === 'SMS' ? user.phoneE164 : user.email;
      const log = await prisma.messageLog.create({
        data: {
          userId: user.id,
          eventId,
          channel,
          toAddress,
          payload: JSON.parse(JSON.stringify({ subject, body })),
          status: 'PENDING',
        },
      });

      let providerId: string | null = null;
      try {
        if (channel === 'SMS') {
          providerId = await adapter.sendSms({ to: user.phoneE164!, body });
        } else {
          providerId = await adapter.sendEmail({ to: user.email, subject, text: body });
        }
      } catch (err) {
        console.error(`[worker] Send failed user=${user.id} channel=${channel}`, err);
      }

      await prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: providerId ? 'SENT' : 'FAILED',
          providerMessageId: providerId ?? null,
        },
      });
    }
  }

  console.log(`[worker] Reminder job=${job.id} complete. Notified ${users.length} users.`);
}

const redisConnection: any = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD ?? undefined,
      maxRetriesPerRequest: null,
    };

const worker = new Worker<ReminderJobData>(
  REMINDER_QUEUE_NAME,
  processReminder,
  { connection: redisConnection, concurrency: 5 },
);

worker.on('completed', (job) =>
  console.log(`[worker] Job ${job.id} completed.`),
);
worker.on('failed', (job, err) =>
  console.error(`[worker] Job ${job?.id} failed:`, err),
);

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[worker] Reminder worker started. Waiting for jobs…');
