import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RsvpService } from './rsvp.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RsvpSchema, SharedEventRsvpSchema, PlusOneSchema, UpdateTransportationSchema, type RsvpDto, type SharedEventRsvpDto, type PlusOneDto, type UpdateTransportationDto } from '@judien/shared';
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

  // GET /api/events/:eventId/roster-guests — creator/admin: view manually added roster guests
  @UseGuards(AuthGuard('jwt'))
  @Get('events/:eventId/roster-guests')
  getRosterGuests(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.getRosterGuests(eventId, user.id);
  }

  // POST /api/events/:eventId/roster-guests — creator/admin: add a guest to the roster
  @UseGuards(AuthGuard('jwt'))
  @Post('events/:eventId/roster-guests')
  addRosterGuest(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(PlusOneSchema)) dto: PlusOneDto,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.addRosterGuest(eventId, user.id, dto);
  }

  // DELETE /api/events/:eventId/roster-guests/:id — creator/admin: remove a roster guest
  @UseGuards(AuthGuard('jwt'))
  @Delete('events/:eventId/roster-guests/:id')
  @HttpCode(HttpStatus.OK)
  removeRosterGuest(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.removeRosterGuest(eventId, user.id, id);
  }

  // GET /api/events/:eventId/rsvp/plus-ones — current user's plus-ones for this event
  @UseGuards(AuthGuard('jwt'))
  @Get('events/:eventId/rsvp/plus-ones')
  getMyPlusOnes(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.getMyPlusOnes(eventId, user.id);
  }

  // POST /api/events/:eventId/rsvp/plus-ones — add a plus-one guest
  @UseGuards(AuthGuard('jwt'))
  @Post('events/:eventId/rsvp/plus-ones')
  addPlusOne(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(PlusOneSchema)) dto: PlusOneDto,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.addPlusOne(eventId, user.id, dto);
  }

  // DELETE /api/events/:eventId/rsvp/plus-ones/:id — remove a plus-one guest
  @UseGuards(AuthGuard('jwt'))
  @Delete('events/:eventId/rsvp/plus-ones/:id')
  @HttpCode(HttpStatus.OK)
  removePlusOne(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.removePlusOne(eventId, user.id, id);
  }

  // PATCH /api/events/:eventId/rsvp/transportation — save how the user is getting there
  @UseGuards(AuthGuard('jwt'))
  @Patch('events/:eventId/rsvp/transportation')
  updateTransportation(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(UpdateTransportationSchema)) dto: UpdateTransportationDto,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.updateTransportation(eventId, user.id, dto.method);
  }

  // POST /api/events/:eventId/sub-events/:subId/join — join a sub-event
  @UseGuards(AuthGuard('jwt'))
  @Post('events/:eventId/sub-events/:subId/join')
  joinSubEvent(
    @Param('eventId') eventId: string,
    @Param('subId') subId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.joinSubEvent(eventId, user.id, subId);
  }

  // DELETE /api/events/:eventId/sub-events/:subId/join — leave a sub-event
  @UseGuards(AuthGuard('jwt'))
  @Delete('events/:eventId/sub-events/:subId/join')
  @HttpCode(HttpStatus.OK)
  leaveSubEvent(
    @Param('eventId') eventId: string,
    @Param('subId') subId: string,
    @CurrentUser() user: User,
  ) {
    return this.rsvpService.leaveSubEvent(eventId, user.id, subId);
  }
}
