import { Module } from '@nestjs/common';
import { BlastService } from './blast.service';
import { BlastController } from './blast.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [NotificationsModule, GroupsModule],
  providers: [BlastService],
  controllers: [BlastController],
})
export class BlastModule {}
