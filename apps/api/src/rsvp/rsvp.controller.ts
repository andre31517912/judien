import { Controller, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RsvpService } from './rsvp.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RsvpSchema, type RsvpDto } from '@judien/shared';
import type { User } from '@prisma/client';

@Controller('events/:eventId/rsvp')
@UseGuards(AuthGuard('jwt'))
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  // POST /api/events/:eventId/rsvp
  @Post()
  upsert(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(RsvpSchema)) dto: RsvpDto,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.upsert(eventId, user.id, dto);
  }

  // DELETE /api/events/:eventId/rsvp  — remove RSVP (back to undecided)
  @Delete()
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.remove(eventId, user.id);
  }
}
