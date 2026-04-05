import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventSeriesService } from './event-series.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateEventSeriesSchema,
  LinkEventToSeriesSchema,
  type CreateEventSeriesDto,
  type LinkEventToSeriesDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Controller('event-series')
export class EventSeriesController {
  constructor(private readonly service: EventSeriesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateEventSeriesSchema)) dto: CreateEventSeriesDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get()
  listByGroup(@Query('groupId') groupId: string) {
    return this.service.listByGroup(groupId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('events/:eventId/link')
  linkEvent(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(LinkEventToSeriesSchema)) dto: LinkEventToSeriesDto,
    @CurrentUser() user: User,
  ) {
    return this.service.linkEvent(eventId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('events/:eventId/link')
  unlinkEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.unlinkEvent(eventId, user);
  }
}
