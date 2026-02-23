import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { CommentsModule } from './comments/comments.module';
import { RemindersModule } from './reminders/reminders.module';
import { BlastModule } from './blast/blast.module';
import { MessagingModule } from './messaging/messaging.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    MessagingModule,
    QueueModule,
    AuthModule,
    UsersModule,
    EventsModule,
    RsvpModule,
    CommentsModule,
    RemindersModule,
    BlastModule,
  ],
})
export class AppModule {}
