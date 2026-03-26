import { Module } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [GroupsModule],
  providers: [RsvpService],
  controllers: [RsvpController],
})
export class RsvpModule {}
