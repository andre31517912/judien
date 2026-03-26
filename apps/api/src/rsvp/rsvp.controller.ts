import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RsvpService } from './rsvp.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RsvpSchema, type RsvpDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T { return user; }
}

@Controller('events/:eventId/rsvp')
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  // GET /api/events/:eventId/rsvp/guests — visible to any logged-in user
  @UseGuards(new OptionalJwtGuard())
  @Get('guests')
  guests(
    @Param('eventId') eventId: string,
    @CurrentUser() user?: User,
  ) {
    return this.rsvpService.guests(eventId, user?.id);
  }

  // POST /api/events/:eventId/rsvp
  @UseGuards(AuthGuard('jwt'))
  @Post()
  upsert(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(RsvpSchema)) dto: RsvpDto,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.upsert(eventId, user.id, dto);
  }

  // DELETE /api/events/:eventId/rsvp  — remove RSVP (back to undecided)
  @UseGuards(AuthGuard('jwt'))
  @Delete()
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.remove(eventId, user.id);
  }
}
