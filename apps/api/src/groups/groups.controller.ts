import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
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
  AddMemberDirectlySchema,
  CreateAndAddMemberSchema,
  BulkCreateAndAddMembersSchema,
  SetParentGroupSchema,
  CreateGroupRelationshipRequestSchema,
  ReviewGroupRelationshipRequestSchema,
  UpdateGroupNicknameSchema,
  type ChangeGroupMemberRoleDto,
  type CreateGroupDto,
  type CreateGroupJoinRequestDto,
  type InviteGroupMembersDto,
  type RespondGroupInviteDto,
  type ReviewGroupJoinRequestDto,
  type UpdateGroupSettingsDto,
  type AddMemberDirectlyDto,
  type CreateAndAddMemberDto,
  type BulkCreateAndAddMembersDto,
  type SetParentGroupDto,
  type CreateGroupRelationshipRequestDto,
  type ReviewGroupRelationshipRequestDto,
  type UpdateGroupNicknameDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { GroupsService } from './groups.service';

const tmpDir = resolve(process.cwd(), 'uploads', 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

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

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/order')
  reorderMyGroups(
    @CurrentUser() user: User,
    @Body() body: { order: string[] },
  ) {
    return this.groupsService.reorderMyGroups(user, body.order ?? []);
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
    @Query('includeChildGroups') includeChildGroups: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.members(groupId, user, includeChildGroups === 'true');
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

  @Get('invites/:token/info')
  getGroupInviteInfo(@Param('token') token: string) {
    return this.groupsService.getGroupInviteInfo(token);
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
  @Get('my-join-requests')
  myJoinRequests(@CurrentUser() user: User) {
    return this.groupsService.myJoinRequests(user);
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
  @Get(':groupId/members/search-users')
  searchUsersToAdd(
    @Param('groupId') groupId: string,
    @Query('q') q: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.searchUsersToAdd(groupId, q ?? '', user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/members/new-and-add')
  createAndAddMember(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(CreateAndAddMemberSchema)) dto: CreateAndAddMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.createAndAddMember(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/members/bulk-create-and-add')
  bulkCreateAndAddMembers(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(BulkCreateAndAddMembersSchema)) dto: BulkCreateAndAddMembersDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.bulkCreateAndAddMembers(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/members')
  addMemberDirectly(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(AddMemberDirectlySchema)) dto: AddMemberDirectlyDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.addMemberDirectly(groupId, dto, user);
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

  @UseGuards(AuthGuard('jwt'))
  @Patch(':groupId/members/me/nickname')
  updateMyGroupNickname(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(UpdateGroupNicknameSchema)) dto: UpdateGroupNicknameDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.updateMyGroupNickname(groupId, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':groupId/members/:memberUserId/nickname')
  updateMemberGroupNickname(
    @Param('groupId') groupId: string,
    @Param('memberUserId') memberUserId: string,
    @Body(new ZodValidationPipe(UpdateGroupNicknameSchema)) dto: UpdateGroupNicknameDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.updateMemberGroupNickname(groupId, memberUserId, dto, user);
  }

  // ─── Subgroups ────────────────────────────────────────────────────────────

  @Get(':groupId/subgroups')
  subgroups(@Param('groupId') groupId: string) {
    return this.groupsService.subgroups(groupId);
  }

  @Get(':groupId/relationships')
  groupRelationships(@Param('groupId') groupId: string) {
    return this.groupsService.groupRelationships(groupId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':groupId/parent')
  setParentGroup(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(SetParentGroupSchema)) dto: SetParentGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.setParentGroup(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/relationship-requests')
  createRelationshipRequest(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(CreateGroupRelationshipRequestSchema)) dto: CreateGroupRelationshipRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.createRelationshipRequest(groupId, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/relationship-requests')
  listRelationshipRequests(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.listRelationshipRequests(groupId, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('relationship-requests/:requestId/review')
  reviewRelationshipRequest(
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(ReviewGroupRelationshipRequestSchema)) dto: ReviewGroupRelationshipRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.reviewRelationshipRequest(requestId, dto, user);
  }

  // ─── Import / Export ─────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/members/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpDir,
        filename: (_req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async importMembers(
    @Param('groupId') groupId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.importMembers(groupId, file.path, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/members/export')
  async exportMembers(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.groupsService.exportMembers(groupId, user);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ─── Donations ───────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Post(':groupId/donations')
  createDonation(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
    @Body() body: { forUserId: string; amount: number; currency: string; date: string; note?: string },
  ) {
    return this.groupsService.createDonation(groupId, user, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/donations')
  listDonations(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.listDonations(groupId, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':groupId/donations/:donationId')
  deleteDonation(
    @Param('groupId') groupId: string,
    @Param('donationId') donationId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.deleteDonation(groupId, donationId, user);
  }

  // ─── Delete Group ─────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Delete(':groupId')
  deleteGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.deleteGroup(groupId, user);
  }

  // ─── Group Report ─────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/report')
  getGroupReport(
    @Param('groupId') groupId: string,
    @Query('year') year: string,
    @CurrentUser() user: User,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    return this.groupsService.getGroupReport(groupId, y, user);
  }
}
