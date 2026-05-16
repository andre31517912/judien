import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvitesService } from './invites.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateInviteSchema, type CreateInviteDto } from '@judien/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { User } from '../__generated__/prisma';

@Controller('invites')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // POST /api/invites
  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(CreateInviteSchema)) dto: CreateInviteDto,
  ) {
    return this.invitesService.create(user.id, dto);
  }

  // GET /api/invites
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.invitesService.findAll(user.id);
  }

  // DELETE /api/invites/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentUser() user: User, @Param('id') id: string) {
    return this.invitesService.revoke(user.id, id);
  }
}
