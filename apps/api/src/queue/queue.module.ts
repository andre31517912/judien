import { Global, Module } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';
export const REMINDER_QUEUE = 'REMINDER_QUEUE';
export const REMINDER_QUEUE_NAME = 'reminders';

// Support REDIS_URL (Upstash rediss://, Render, Railway) or individual host/port vars.
function buildRedisOptions() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: Number(url.port),
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null as null,
      ...(process.env.REDIS_URL.startsWith('rediss://') ? { tls: {} } : {}),
    };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL is required in production.');
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
    maxRetriesPerRequest: null as null,
  };
}

const rawRedisOptions = buildRedisOptions();

const redisProvider = {
  provide: REDIS_CONNECTION,
  useValue: new IORedis(rawRedisOptions as any),
};

const queueOptions: QueueOptions = { connection: rawRedisOptions as any };

const reminderQueueProvider = {
  provide: REMINDER_QUEUE,
  useValue: new Queue(REMINDER_QUEUE_NAME, queueOptions),
};

@Global()
@Module({
  providers: [redisProvider, reminderQueueProvider],
  exports: [REDIS_CONNECTION, REMINDER_QUEUE],
})
export class QueueModule {}
