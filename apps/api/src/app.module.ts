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
import { UploadModule } from './upload/upload.module';
import { NewsModule } from './news/news.module';
import { GroupsModule } from './groups/groups.module';
import { GroupMessagesModule } from './group-messages/group-messages.module';
import { EventInvitesModule } from './event-invites/event-invites.module';
import { EventSeriesModule } from './event-series/event-series.module';
import { HealthController } from './health/health.controller';

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
    UploadModule,
    NewsModule,
    GroupsModule,
    GroupMessagesModule,
    EventInvitesModule,
    EventSeriesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
