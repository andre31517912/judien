import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RsvpService } from './rsvp.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RsvpSchema, SharedEventRsvpSchema, type RsvpDto, type SharedEventRsvpDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import type { Request } from 'express';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T { return user; }
}

@Controller()
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  // GET /api/events/:eventId/rsvp/export — admin or event creator only
  @UseGuards(AuthGuard('jwt'))
  @Get('events/:eventId/rsvp/export')
  exportRsvps(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.exportRsvps(eventId, user.id);
  }

  // GET /api/events/:eventId/rsvp/guests — visible to any logged-in user
  @UseGuards(new OptionalJwtGuard())
  @Get('events/:eventId/rsvp/guests')
  guests(
    @Param('eventId') eventId: string,
    @CurrentUser() user?: User,
  ) {
    return this.rsvpService.guests(eventId, user?.id);
  }

  // GET /api/events/share/:token/rsvp/guests
  @UseGuards(new OptionalJwtGuard())
  @Get('events/share/:token/rsvp/guests')
  guestsByShareToken(
    @Param('token') token: string,
    @CurrentUser() user?: User,
  ) {
    return this.rsvpService.guestsByShareToken(token, user?.id);
  }

  // POST /api/events/:eventId/rsvp
  @UseGuards(AuthGuard('jwt'))
  @Post('events/:eventId/rsvp')
  upsert(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(RsvpSchema)) dto: RsvpDto,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.upsert(eventId, user.id, dto);
  }

  // POST /api/events/share/:token/rsvp
  @UseGuards(new OptionalJwtGuard())
  @Post('events/share/:token/rsvp')
  upsertByShareToken(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(SharedEventRsvpSchema)) dto: SharedEventRsvpDto,
    @CurrentUser() user: User | undefined,
    @Req() req: Request,
  ) {
    return this.rsvpService.upsertFromShareLink(token, user?.id, dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
  }

  // DELETE /api/events/:eventId/rsvp  — remove RSVP (back to undecided)
  @UseGuards(AuthGuard('jwt'))
  @Delete('events/:eventId/rsvp')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.remove(eventId, user.id);
  }
}
