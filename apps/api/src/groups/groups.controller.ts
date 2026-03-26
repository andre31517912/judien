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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  ChangeGroupMemberRoleSchema,
  CreateGroupJoinRequestSchema,
  CreateGroupSchema,
  InviteGroupMembersSchema,
  RespondGroupInviteSchema,
  ReviewGroupJoinRequestSchema,
  UpdateGroupSettingsSchema,
  type ChangeGroupMemberRoleDto,
  type CreateGroupDto,
  type CreateGroupJoinRequestDto,
  type InviteGroupMembersDto,
  type RespondGroupInviteDto,
  type ReviewGroupJoinRequestDto,
  type UpdateGroupSettingsDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { GroupsService } from './groups.service';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T {
    return user;
  }
}

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateGroupSchema)) dto: CreateGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.create(dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  myGroups(@CurrentUser() user: User) {
    return this.groupsService.myGroups(user);
  }

  @UseGuards(new OptionalJwtGuard())
  @Get('search')
  search(
    @Query('q') q = '',
    @CurrentUser() user?: User,
  ) {
    return this.groupsService.search(q, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/members')
  members(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.members(groupId, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':groupId/settings')
  updateSettings(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(UpdateGroupSettingsSchema)) dto: UpdateGroupSettingsDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.updateSettings(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/invites')
  listInvites(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.listInvites(groupId, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/invites')
  invite(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(InviteGroupMembersSchema)) dto: InviteGroupMembersDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.invite(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('invitations/me')
  myInvitations(@CurrentUser() user: User) {
    return this.groupsService.myInvitations(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('invitations/:token/respond')
  respondInvitation(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(RespondGroupInviteSchema)) dto: RespondGroupInviteDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.respondToInvitation(token, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/join-requests')
  requestJoin(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(CreateGroupJoinRequestSchema)) dto: CreateGroupJoinRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.requestJoin(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/join-requests')
  listJoinRequests(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.listJoinRequests(groupId, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join-requests/:requestId/review')
  reviewJoinRequest(
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(ReviewGroupJoinRequestSchema)) dto: ReviewGroupJoinRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.reviewJoinRequest(requestId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':groupId/members/:memberUserId/role')
  changeMemberRole(
    @Param('groupId') groupId: string,
    @Param('memberUserId') memberUserId: string,
    @Body(new ZodValidationPipe(ChangeGroupMemberRoleSchema)) dto: ChangeGroupMemberRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.changeMemberRole(groupId, memberUserId, dto.role, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':groupId/members/:memberUserId')
  removeMember(
    @Param('groupId') groupId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.removeMember(groupId, memberUserId, user);
  }
}
