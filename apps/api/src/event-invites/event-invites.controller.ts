import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventInvitesService } from './event-invites.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateEventInviteSchema,
  AcceptEventInviteSchema,
  type CreateEventInviteDto,
  type AcceptEventInviteDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';

// Optional JWT guard – attaches user if token present, doesn't throw if missing
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: unknown, user: T): T {
    return user;
  }
}

@Controller('event-invites')
export class EventInvitesController {
  constructor(private readonly eventInvitesService: EventInvitesService) {}

  // POST /api/event-invites – create invite (requires auth + event ownership/admin)
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateEventInviteSchema)) dto: CreateEventInviteDto,
    @CurrentUser() user: User,
  ) {
    // TODO: verify user is event creator or admin
    return this.eventInvitesService.createInvite(dto.eventId, user.id);
  }

  // GET /api/event-invites/:token/info – get invite info without accepting (public)
  @Get(':token/info')
  async getInviteInfo(@Param('token') token: string) {
    return this.eventInvitesService.getInviteInfo(token);
  }

  // POST /api/event-invites/:token/accept – accept invite (public, no auth needed)
  @UseGuards(new OptionalJwtGuard())
  @Post(':token/accept')
  async accept(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(AcceptEventInviteSchema)) dto: AcceptEventInviteDto,
  ) {
    return this.eventInvitesService.acceptInvite(token, dto);
  }

  // GET /api/event-invites/:eventId – get all invites for event (creator/admin only)
  @UseGuards(AuthGuard('jwt'))
  @Get('event/:eventId')
  async getEventInvites(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.eventInvitesService.getEventInvites(eventId);
  }

  // GET /api/event-invites/event/:eventId/invitees – list who accepted invites
  @UseGuards(AuthGuard('jwt'))
  @Get('event/:eventId/invitees')
  async getEventInvitees(
    @Param('eventId') eventId: string,
    @CurrentUser() _user: User,
  ) {
    return this.eventInvitesService.getEventInvitees(eventId);
  }

  // DELETE /api/event-invites/:inviteId – revoke invite (creator/admin only)
  @UseGuards(AuthGuard('jwt'))
  @Delete(':inviteId')
  async revoke(
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: User,
  ) {
    return this.eventInvitesService.revokeInvite(inviteId);
  }
}
