import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RemindersService } from './reminders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SetRemindersSchema, type SetRemindersDto } from '@judien/shared';

@Controller('events/:eventId/reminders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // GET /api/events/:eventId/reminders
  @Get()
  get(@Param('eventId') eventId: string) {
    return this.remindersService.getForEvent(eventId);
  }

  // POST /api/events/:eventId/reminders
  @Post()
  set(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(SetRemindersSchema)) dto: SetRemindersDto,
  ) {
    return this.remindersService.setForEvent(eventId, dto);
  }
}
