import { Module } from '@nestjs/common';
import { EventInvitesService } from './event-invites.service';
import { EventInvitesController } from './event-invites.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EventInvitesService],
  controllers: [EventInvitesController],
  exports: [EventInvitesService],
})
export class EventInvitesModule {}
