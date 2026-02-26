import { Global, Module } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';
export const REMINDER_QUEUE = 'REMINDER_QUEUE';
export const REMINDER_QUEUE_NAME = 'reminders';

const redisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD ?? undefined,
  maxRetriesPerRequest: null, // required for BullMQ
};

const redisProvider = {
  provide: REDIS_CONNECTION,
  useValue: new IORedis(redisOptions),
};

const queueOptions: QueueOptions = { connection: redisOptions };

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
