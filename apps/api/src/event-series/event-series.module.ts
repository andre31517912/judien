import { Module } from '@nestjs/common';
import { EventSeriesController } from './event-series.controller';
import { EventSeriesService } from './event-series.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EventSeriesController],
  providers: [EventSeriesService],
  exports: [EventSeriesService],
})
export class EventSeriesModule {}
