import { Module } from '@nestjs/common';
import { BlastService } from './blast.service';
import { BlastController } from './blast.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [BlastService],
  controllers: [BlastController],
})
export class BlastModule {}
