import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';
import type {
  AddMemberDirectlyDto,
  BulkCreateAndAddMembersDto,
  CreateGroupRelationshipRequestDto,
  CreateAndAddMemberDto,
  CreateGroupDto,
  CreateGroupJoinRequestDto,
  InviteGroupMembersDto,
  ReviewGroupRelationshipRequestDto,
  RespondGroupInviteDto,
  ReviewGroupJoinRequestDto,
  SetParentGroupDto,
  UpdateGroupNicknameDto,
  UpdateGroupSettingsDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateGroupDto, user: User) {
    const isPlatformAdmin = user.role === 'ADMIN';

    const duplicate = await this.prisma.group.findUnique({
      where: { name: dto.name.trim() },
    });
    if (duplicate) {
      throw new ConflictException(`A group named "${dto.name}" already exists.`);
    }

    if (!isPlatformAdmin && dto.parentGroupId) {
      throw new ForbiddenException('Only platform admins can assign a parent group during creation.');
    }

    // Group creator is always a group admin. Only platform admins can pre-assign extra admins.
    const adminIds = isPlatformAdmin
      ? Array.from(new Set([user.id, ...dto.adminUserIds]))
      : [user.id];

    // Only platform admins can pre-seed members during creation.
    const initialMemberIds = isPlatformAdmin ? (dto.initialMemberIds ?? []) : [];

    return this.prisma.$transaction(async (tx) => {
      if (dto.parentGroupId) {
        await this.ensureGroupExists(dto.parentGroupId);
        await this.assertNoHierarchyCycle(dto.pid, dto.parentGroupId);
      }

      const group = await tx.group.create({
        data: {
          pid: dto.pid,
          name: dto.name,
          description: dto.description ?? '',
          photoUrl: dto.photoUrl ?? null,
          discoverableBySearch: dto.discoverableBySearch ?? true,
          createdById: user.id,
          ...(dto.parentGroupId ? { parentGroupId: dto.parentGroupId } : {}),
        },
      });

      await tx.groupMembership.createMany({
        data: adminIds.map((adminId) => ({
          groupId: group.id,
          userId: adminId,
          role: 'GROUP_ADMIN',
          status: 'ACCEPTED',
          joinedAt: new Date(),
          ...(isPlatformAdmin ? { invitedByPlatformAdminId: user.id } : {}),
        })),
        skipDuplicates: true,
      });

      // Add any initial members (e.g. selected from parent group member list)
      if (initialMemberIds.length > 0) {
        const memberIds = initialMemberIds.filter((id) => !adminIds.includes(id));
        if (memberIds.length > 0) {
          await tx.groupMembership.createMany({
            data: memberIds.map((memberId) => ({
              groupId: group.id,
              userId: memberId,
              role: 'GROUP_MEMBER' as const,
              status: 'ACCEPTED' as const,
              joinedAt: new Date(),
              ...(isPlatformAdmin ? { invitedByPlatformAdminId: user.id } : {}),
            })),
            skipDuplicates: true,
          });
        }
      }

      return group;
    });
  }

  async myGroups(user: User) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId: user.id, status: 'ACCEPTED' },
      include: { group: { include: { createdBy: { select: { displayName: true } } } } },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    return memberships.map((m) => ({
      group: m.group,
      membership: {
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      },
    }));
  }

  async reorderMyGroups(user: User, groupIds: string[]) {
    await this.prisma.$transaction(
      groupIds.map((groupId, index) =>
        this.prisma.groupMembership.updateMany({
          where: { userId: user.id, groupId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async search(query: string, user?: User) {
    const q = query.trim();
    if (!q) return [];

    return this.prisma.group.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { createdBy: { select: { id: true, displayName: true } } },
      orderBy: { name: 'asc' },
      take: 25,
    });
  }

  async updateSettings(groupId: string, dto: UpdateGroupSettingsDto, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    await this.ensureGroupExists(groupId);
    // Only pass fields that are present in dto to avoid overwriting with undefined
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.discoverableBySearch !== undefined) data.discoverableBySearch = dto.discoverableBySearch;
    return this.prisma.group.update({ where: { id: groupId }, data });
  }

  async deleteGroup(groupId: string, user: User) {
    const group = await this.ensureGroupExists(groupId);
    if (user.role !== 'ADMIN' && group.createdById !== user.id) {
      throw new ForbiddenException('Only the group creator or a platform admin can delete this group.');
    }
    // Null out optional FK references that lack cascade on delete, then delete
    await this.prisma.$transaction([
      this.prisma.news.updateMany({ where: { groupId }, data: { groupId: null } }),
      this.prisma.eventSeries.updateMany({ where: { groupId }, data: { groupId: null } }),
      this.prisma.event.updateMany({ where: { groupId }, data: { groupId: null } }),
      this.prisma.group.updateMany({ where: { parentGroupId: groupId }, data: { parentGroupId: null } }),
      this.prisma.group.delete({ where: { id: groupId } }),
    ]);
    return { deleted: true };
  }

  async members(groupId: string, user: User, includeChildGroups = false) {
    const group = await this.ensureGroupExists(groupId);
    const requesterMembership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });

    const isPlatformAdmin = user.role === 'ADMIN';
    const isGroupAdmin = requesterMembership?.status === 'ACCEPTED' && requesterMembership.role === 'GROUP_ADMIN';
    const isAcceptedMember = requesterMembership?.status === 'ACCEPTED';

    if (!isPlatformAdmin && !isAcceptedMember) {
      throw new ForbiddenException('You do not have access to this group.');
    }

    const rows = await this.prisma.groupMembership.findMany({
      where: { groupId, status: 'ACCEPTED' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneE164: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const directMembers = rows.map((m) => ({
      userId: m.user.id,
      groupNickname: (m as any).groupNickname as string | null,
      displayName: m.user.displayName,
      role: m.role,
      userRole: m.user.role,
      joinedAt: m.joinedAt,
      email: isPlatformAdmin || isGroupAdmin ? m.user.email : null,
      phoneE164: isPlatformAdmin || isGroupAdmin ? m.user.phoneE164 : null,
      childGroupId: null as string | null,
      childGroupName: null as string | null,
    }));

    if (!includeChildGroups) return directMembers;

    // Fetch child groups and their members
    const childGroups = await this.prisma.group.findMany({
      where: { parentGroupId: groupId },
      select: { id: true, name: true },
    });

    const directMemberIds = new Set(directMembers.map((m) => m.userId));
    const childMembers: typeof directMembers = [];

    for (const child of childGroups) {
      const childRows = await this.prisma.groupMembership.findMany({
        where: { groupId: child.id, status: 'ACCEPTED' },
        include: {
          user: { select: { id: true, email: true, phoneE164: true, displayName: true, role: true } },
        },
        orderBy: { joinedAt: 'asc' },
      });
      for (const m of childRows) {
        if (!directMemberIds.has(m.user.id)) {
          childMembers.push({
            userId: m.user.id,
            groupNickname: (m as any).groupNickname as string | null,
            displayName: m.user.displayName,
            role: m.role,
            userRole: m.user.role,
            joinedAt: m.joinedAt,
            email: isPlatformAdmin || isGroupAdmin ? m.user.email : null,
            phoneE164: isPlatformAdmin || isGroupAdmin ? m.user.phoneE164 : null,
            childGroupId: child.id,
            childGroupName: child.name,
          });
        }
      }
    }

    return [...directMembers, ...childMembers];
  }

  async updateMyGroupNickname(groupId: string, userId: string, dto: UpdateGroupNicknameDto) {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || membership.status !== 'ACCEPTED') {
      throw new ForbiddenException('You are not an accepted member of this group.');
    }
    await (this.prisma.groupMembership as any).update({
      where: { groupId_userId: { groupId, userId } },
      data: { groupNickname: dto.groupNickname },
    });
    return { groupNickname: dto.groupNickname };
  }

  async updateMemberGroupNickname(groupId: string, targetUserId: string, dto: UpdateGroupNicknameDto, requestingUser: User) {
    const isPlatformAdmin = requestingUser.role === 'ADMIN';
    if (!isPlatformAdmin) {
      const adminMembership = await this.prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: requestingUser.id } },
      });
      if (!adminMembership || adminMembership.status !== 'ACCEPTED' || adminMembership.role !== 'GROUP_ADMIN') {
        throw new ForbiddenException('Only group admins can edit other members\' nicknames.');
      }
    }
    const target = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found in this group.');
    await (this.prisma.groupMembership as any).update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { groupNickname: dto.groupNickname },
    });
    return { groupNickname: dto.groupNickname };
  }

  async getGroupInviteInfo(token: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: { group: { select: { id: true, name: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found.');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invite is no longer valid.');
    if (new Date() > invite.expiresAt) throw new BadRequestException('Invite has expired.');

    // Check whether the invitee already has an account so the frontend can skip the name form
    let hasAccount = false;
    if (invite.invitedUserId) {
      hasAccount = true;
    } else if (invite.email || invite.phoneE164) {
      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(invite.email ? [{ email: invite.email }] : []),
            ...(invite.phoneE164 ? [{ phoneE164: invite.phoneE164 }] : []),
          ],
        },
      });
      hasAccount = !!existing;
    }

    return { groupId: invite.group.id, groupName: invite.group.name, hasAccount };
  }

  async listInvites(groupId: string, user: User) {
    await this.assertCanSendInvites(groupId, user);
    return this.prisma.groupInvite.findMany({
      where: { groupId, status: 'PENDING' },
      select: {
        id: true,
        token: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        email: true,
        phoneE164: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(groupId: string, dto: InviteGroupMembersDto, user: User) {
    await this.assertCanSendInvites(groupId, user);
    await this.ensureGroupExists(groupId);

    const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate();
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

    return this.prisma.$transaction(async (tx) => {
      const out: Array<{ inviteId: string; token: string; email: string | null; phoneE164: string | null }> = [];

      for (const item of dto.invites) {
        const targetUser = item.userId
          ? await tx.user.findUnique({ where: { id: item.userId } })
          : await tx.user.findFirst({
              where: {
                OR: [
                  ...(item.email ? [{ email: item.email }] : []),
                  ...(item.phoneE164 ? [{ phoneE164: item.phoneE164 }] : []),
                ],
              },
            });

        const token = randomBytes(24).toString('hex');
        const email = item.email ?? targetUser?.email ?? null;
        const phoneE164 = item.phoneE164 ?? targetUser?.phoneE164 ?? null;

        const invite = await tx.groupInvite.create({
          data: {
            groupId,
            invitedByPlatformAdminId: user.id,
            invitedUserId: targetUser?.id ?? null,
            email,
            phoneE164,
            token,
            expiresAt,
          },
        });

        if (targetUser) {
          await tx.groupMembership.upsert({
            where: { groupId_userId: { groupId, userId: targetUser.id } },
            create: {
              groupId,
              userId: targetUser.id,
              status: 'PENDING',
              role: item.role ?? 'GROUP_MEMBER',
              invitedByPlatformAdminId: user.id,
            },
            update: {
              status: 'PENDING',
              role: item.role ?? 'GROUP_MEMBER',
              invitedByPlatformAdminId: user.id,
              joinedAt: null,
            },
          });
        }

        const inviteLink = `${webOrigin}/invite/${token}`;
        if (email) {
          await this.messaging.sendEmail({
            userId: targetUser?.id ?? user.id,
            to: email,
            subject: 'Judien group invitation',
            text: `You have been invited to join a group on Judien. Open this link to respond: ${inviteLink}`,
          });
        }

        out.push({ inviteId: invite.id, token: invite.token, email: invite.email, phoneE164: invite.phoneE164 });
      }

      return { sent: out.length, invites: out };
    });
  }

  async myInvitations(user: User) {
    const now = new Date();
    return this.prisma.groupInvite.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now },
        OR: [
          { invitedUserId: user.id },
          { email: user.email },
          { phoneE164: user.phoneE164 },
        ],
      },
      include: { group: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToInvitation(token: string, dto: RespondGroupInviteDto, user: User) {
    const invite = await this.prisma.groupInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invitation not found.');

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invitation is already resolved.');
    }

    if (invite.expiresAt <= new Date()) {
      await this.prisma.groupInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      });
      throw new BadRequestException('Invitation has expired.');
    }

    const matches =
      invite.invitedUserId === user.id ||
      (invite.email && invite.email === user.email) ||
      (invite.phoneE164 && invite.phoneE164 === user.phoneE164);

    if (!matches) {
      throw new ForbiddenException('This invitation does not belong to you.');
    }

    if (dto.action === 'decline') {
      await this.prisma.$transaction(async (tx) => {
        await tx.groupInvite.update({
          where: { id: invite.id },
          data: {
            status: 'DECLINED',
            invitedUserId: user.id,
            respondedAt: new Date(),
          },
        });
        await tx.groupMembership.upsert({
          where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
          create: {
            groupId: invite.groupId,
            userId: user.id,
            status: 'DECLINED',
          },
          update: { status: 'DECLINED' },
        });
      });
      return { status: 'DECLINED' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          invitedUserId: user.id,
          respondedAt: new Date(),
        },
      });

      const existing = await tx.groupMembership.findUnique({
        where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
      });

      await tx.groupMembership.upsert({
        where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
        create: {
          groupId: invite.groupId,
          userId: user.id,
          status: 'ACCEPTED',
          role: existing?.role ?? 'GROUP_MEMBER',
          joinedAt: new Date(),
        },
        update: {
          status: 'ACCEPTED',
          joinedAt: new Date(),
        },
      });
    });

    // Notify group admins that the invite was accepted
    this.notifyAdminsInviteAccepted(invite.groupId, user).catch(() => {});

    // Fire-and-forget: notify the new member of any upcoming events they missed
    this.notifyMemberOfUpcomingEvents(invite.groupId, user.id).catch(() => {});

    return { status: 'ACCEPTED' };
  }

  async myJoinRequests(user: User) {
    return this.prisma.groupJoinRequest.findMany({
      where: { requesterUserId: user.id, status: 'PENDING' },
      select: { groupId: true, status: true, createdAt: true },
    });
  }

  async requestJoin(groupId: string, dto: CreateGroupJoinRequestDto, user: User) {
    const group = await this.ensureGroupExists(groupId);
    if (!group.discoverableBySearch) {
      throw new ForbiddenException('This group is not accepting searchable join requests.');
    }

    const existingMembership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existingMembership?.status === 'ACCEPTED') {
      throw new BadRequestException('You are already a member of this group.');
    }

    return this.prisma.groupJoinRequest.upsert({
      where: { groupId_requesterUserId: { groupId, requesterUserId: user.id } },
      create: {
        groupId,
        requesterUserId: user.id,
        note: dto.note ?? '',
      },
      update: {
        status: 'PENDING',
        note: dto.note ?? '',
        reviewedAt: null,
        reviewedByUserId: null,
      },
    }).then(async (req) => {
      // Notify all GROUP_ADMINs of this group
      const admins = await this.prisma.groupMembership.findMany({
        where: { groupId, role: 'GROUP_ADMIN', status: 'ACCEPTED' },
        select: { userId: true },
      });
      const requesterName = (user as any).displayName || user.email || user.phoneE164 || 'Someone';
      await this.notifications.createMany(
        admins.map((a) => ({
          userId: a.userId,
          type: 'JOIN_REQUEST_RECEIVED' as const,
          title_en: `New join request for ${group.name}`,
          title_zh: `${group.name} 有新的加入申請`,
          body_en: `${requesterName} has requested to join ${group.name}.`,
          body_zh: `${requesterName} 申請加入 ${group.name}。`,
          actionUrl: `/admin/groups/${groupId}/settings`,
          groupId,
          requestId: req.id,
        })),
      );
      return req;
    });
  }

  async listJoinRequests(groupId: string, user: User) {
    await this.assertCanReviewJoinRequests(groupId, user);
    return this.prisma.groupJoinRequest.findMany({
      where: { groupId, status: 'PENDING' },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            phoneE164: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewJoinRequest(requestId: string, dto: ReviewGroupJoinRequestDto, user: User) {
    const req = await this.prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Join request not found.');

    await this.assertCanReviewJoinRequests(req.groupId, user);

    if (req.status !== 'PENDING') {
      throw new BadRequestException('Join request has already been resolved.');
    }

    const group = await this.prisma.group.findUnique({ where: { id: req.groupId }, select: { name: true } });
    const groupName = group?.name ?? 'the group';

    if (dto.action === 'reject') {
      const updated = await this.prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
        },
      });
      await this.notifications.create({
        userId: req.requesterUserId,
        type: 'JOIN_REQUEST_REJECTED',
        title_en: `Join request declined`,
        title_zh: `加入申請被拒絕`,
        body_en: `Your request to join ${groupName} has been declined.`,
        body_zh: `您申請加入 ${groupName} 的請求已被拒絕。`,
        groupId: req.groupId,
        requestId,
      });
      return updated;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.groupJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
        },
      });

      await tx.groupMembership.upsert({
        where: { groupId_userId: { groupId: req.groupId, userId: req.requesterUserId } },
        create: {
          groupId: req.groupId,
          userId: req.requesterUserId,
          role: 'GROUP_MEMBER',
          status: 'ACCEPTED',
          joinedAt: new Date(),
        },
        update: {
          status: 'ACCEPTED',
          joinedAt: new Date(),
        },
      });

      return updated;
    }).then(async (updated) => {
      await this.notifications.create({
        userId: req.requesterUserId,
        type: 'JOIN_REQUEST_APPROVED',
        title_en: `Join request approved`,
        title_zh: `加入申請已批准`,
        body_en: `Your request to join ${groupName} has been approved. Welcome!`,
        body_zh: `您申請加入 ${groupName} 的請求已獲批准，歡迎加入！`,
        groupId: req.groupId,
        requestId,
      });
      // Fire-and-forget: surface upcoming events for the newly-approved member
      this.notifyMemberOfUpcomingEvents(req.groupId, req.requesterUserId).catch(() => {});
      return updated;
    });
  }

  async changeMemberRole(groupId: string, memberUserId: string, role: 'GROUP_ADMIN' | 'GROUP_MEMBER', user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    await this.ensureGroupExists(groupId);

    if (memberUserId === user.id) {
      throw new BadRequestException('You cannot change your own role.');
    }

    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: memberUserId } },
    });
    if (!membership || membership.status !== 'ACCEPTED') {
      throw new BadRequestException('Member not found in this group.');
    }

    const group = await this.ensureGroupExists(groupId);

    await this.prisma.groupMembership.update({
      where: { groupId_userId: { groupId, userId: memberUserId } },
      data: { role },
    });

    const isPromotion = role === 'GROUP_ADMIN';
    await this.notifications.create({
      userId: memberUserId,
      type: 'ROLE_CHANGED' as const,
      title_en: isPromotion ? `You are now an admin of ${group.name}` : `Your role changed in ${group.name}`,
      title_zh: isPromotion ? `您已成為 ${group.name} 的管理員` : `您在 ${group.name} 的角色已變更`,
      body_en: isPromotion
        ? `You have been promoted to group admin in "${group.name}".`
        : `Your role has been changed to member in "${group.name}".`,
      body_zh: isPromotion
        ? `您在群組「${group.name}」中已升為管理員。`
        : `您在群組「${group.name}」中的角色已變更為一般成員。`,
      groupId,
    });

    return { updated: true };
  }

  async removeMember(groupId: string, memberUserId: string, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    await this.ensureGroupExists(groupId);

    if (memberUserId === user.id) {
      throw new BadRequestException('You cannot remove yourself from the group using this endpoint.');
    }

    const group = await this.ensureGroupExists(groupId);

    await this.prisma.groupMembership.upsert({
      where: { groupId_userId: { groupId, userId: memberUserId } },
      create: {
        groupId,
        userId: memberUserId,
        status: 'REMOVED',
        role: 'GROUP_MEMBER',
      },
      update: {
        status: 'REMOVED',
        joinedAt: null,
      },
    });

    await this.notifications.create({
      userId: memberUserId,
      type: 'MEMBER_REMOVED' as const,
      title_en: `Removed from ${group.name}`,
      title_zh: `已從 ${group.name} 移除`,
      body_en: `You have been removed from the group "${group.name}".`,
      body_zh: `您已被從群組「${group.name}」中移除。`,
      groupId,
    });

    return { removed: true };
  }

  async addMemberDirectly(groupId: string, dto: AddMemberDirectlyDto, user: User) {
    // Allow platform admin OR group admin to force-add members
    await this.assertCanManageGroupSettings(groupId, user);
    const group = await this.ensureGroupExists(groupId);

    const id = dto.identifier.trim();
    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { email: id },
          { phoneE164: id },
        ],
      },
    });

    if (!targetUser) {
      // No account yet — fall back to sending an invite link so they can create one
      const isEmail = id.includes('@');
      const result = await this.invite(
        groupId,
        { invites: [isEmail ? { email: id, role: dto.role } : { phoneE164: id, role: dto.role }] },
        user,
      );
      return { added: false, invited: true, identifier: id, ...result };
    }

    await this.prisma.groupMembership.upsert({
      where: { groupId_userId: { groupId, userId: targetUser.id } },
      create: {
        groupId,
        userId: targetUser.id,
        status: 'ACCEPTED',
        role: dto.role,
        joinedAt: new Date(),
        ...(user.role === 'ADMIN' ? { invitedByPlatformAdminId: user.id } : {}),
      },
      update: {
        status: 'ACCEPTED',
        role: dto.role,
        joinedAt: new Date(),
        ...(user.role === 'ADMIN' ? { invitedByPlatformAdminId: user.id } : {}),
      },
    });

    // Notify the user they have been added
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const groupLink = `${webOrigin}/en/groups/${groupId}`;
    const isPlaceholderEmail = !!(targetUser.email?.endsWith('@guest.local') || targetUser.email?.endsWith('@invited.local'));
    if (targetUser.email && !isPlaceholderEmail) {
      await this.messaging.sendEmail({
        userId: targetUser.id,
        to: targetUser.email,
        subject: `You have been added to ${group.name}`,
        text: `You have been added to the group "${group.name}" on Judien. Click here to view: ${groupLink}`,
      });
    }

    await this.notifications.create({
      userId: targetUser.id,
      type: 'MEMBER_ADDED' as const,
      title_en: `Added to ${group.name}`,
      title_zh: `已加入 ${group.name}`,
      body_en: `You have been added to the group "${group.name}".`,
      body_zh: `您已被加入群組「${group.name}」。`,
      actionUrl: `/groups/${groupId}`,
      groupId,
    });

    // Fire-and-forget: surface upcoming events for the newly-added member
    this.notifyMemberOfUpcomingEvents(groupId, targetUser.id).catch(() => {});

    return { added: true, userId: targetUser.id, displayName: targetUser.displayName };
  }

  async searchUsersToAdd(groupId: string, q: string, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    const query = (q ?? '').trim();
    if (query.length < 2) return [];

    const existingMemberIds = (await this.prisma.groupMembership.findMany({
      where: { groupId, status: 'ACCEPTED' },
      select: { userId: true },
    })).map((m) => m.userId);

    return this.prisma.user.findMany({
      where: {
        id: { notIn: existingMemberIds },
        OR: [
          { displayName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phoneE164: { contains: query } },
        ],
      },
      select: { id: true, displayName: true, email: true, phoneE164: true },
      take: 10,
    });
  }

  async createAndAddMember(groupId: string, dto: CreateAndAddMemberDto, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    const group = await this.ensureGroupExists(groupId);

    if (!dto.phone && !dto.email) {
      throw new BadRequestException('At least one of phone or email is required.');
    }

    // If a user with this phone/email already exists, just add them
    const orConditions = [
      ...(dto.phone ? [{ phoneE164: dto.phone }] : []),
      ...(dto.email ? [{ email: dto.email }] : []),
    ];
    const existingUser = await this.prisma.user.findFirst({ where: { OR: orConditions } });
    if (existingUser) {
      await this.prisma.groupMembership.upsert({
        where: { groupId_userId: { groupId, userId: existingUser.id } },
        create: { groupId, userId: existingUser.id, status: 'ACCEPTED', role: dto.role, joinedAt: new Date() },
        update: { status: 'ACCEPTED', role: dto.role, joinedAt: new Date() },
      });
      return { created: false, added: true, userId: existingUser.id, displayName: existingUser.displayName };
    }

    // Create brand-new user account and add to group in a transaction
    const tempPassword = dto.password ?? randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: dto.email ?? null,
          phoneE164: dto.phone ?? null,
          displayName: dto.displayName.trim() || null,
          passwordHash,
          hasPassword: true,
          role: 'USER',
          preferredLanguage: 'en',
        },
      });
      await tx.groupMembership.create({
        data: {
          groupId,
          userId: u.id,
          status: 'ACCEPTED',
          role: dto.role,
          joinedAt: new Date(),
          ...(user.role === 'ADMIN' ? { invitedByPlatformAdminId: user.id } : {}),
        },
      });
      return u;
    });

    // Notify the new user
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const groupLink = `${webOrigin}/en/groups/${groupId}`;
    if (newUser.email) {
      await this.messaging.sendEmail({
        userId: newUser.id,
        to: newUser.email,
        subject: `You have been added to ${group.name} on Judien`,
        text: `A Judien account has been created for you and you have been added to the group "${group.name}". Visit: ${groupLink}`,
      });
    }

    return { created: true, added: true, userId: newUser.id, displayName: newUser.displayName, tempPassword };
  }

  async bulkCreateAndAddMembers(groupId: string, dto: BulkCreateAndAddMembersDto, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    const group = await this.ensureGroupExists(groupId);
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const groupLink = `${webOrigin}/en/groups/${groupId}`;

    const results: {
      displayName: string;
      email?: string;
      phone?: string;
      created: boolean;
      added: boolean;
      tempPassword?: string;
      error?: string;
    }[] = [];

    for (const member of dto.members) {
      try {
        const tempPassword = dto.passwordMode === 'shared' ? dto.sharedPassword! : randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        // Check if user already exists
        const orConditions = [
          ...(member.phone ? [{ phoneE164: member.phone }] : []),
          ...(member.email ? [{ email: member.email }] : []),
        ];
        const existingUser = await this.prisma.user.findFirst({ where: { OR: orConditions } });

        if (existingUser) {
          await this.prisma.groupMembership.upsert({
            where: { groupId_userId: { groupId, userId: existingUser.id } },
            create: { groupId, userId: existingUser.id, status: 'ACCEPTED', role: dto.role, joinedAt: new Date() },
            update: { status: 'ACCEPTED', role: dto.role, joinedAt: new Date() },
          });
          this.notifyMemberOfUpcomingEvents(groupId, existingUser.id).catch(() => {});
          results.push({ displayName: existingUser.displayName ?? member.displayName, email: member.email, phone: member.phone, created: false, added: true });
          continue;
        }

        const newUser = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              email: member.email ?? null,
              phoneE164: member.phone ?? null,
              displayName: member.displayName.trim() || null,
              passwordHash,
              hasPassword: true,
              role: 'USER',
              preferredLanguage: 'en',
            },
          });
          await tx.groupMembership.create({
            data: {
              groupId,
              userId: u.id,
              status: 'ACCEPTED',
              role: dto.role,
              joinedAt: new Date(),
              ...(user.role === 'ADMIN' ? { invitedByPlatformAdminId: user.id } : {}),
            },
          });
          return u;
        });

        if (newUser.email) {
          await this.messaging.sendEmail({
            userId: newUser.id,
            to: newUser.email,
            subject: `You have been added to ${group.name} on Judien`,
            text: `A Judien account has been created for you and you have been added to "${group.name}". Visit: ${groupLink}`,
          }).catch(() => {});
        }

        this.notifyMemberOfUpcomingEvents(groupId, newUser.id).catch(() => {});

        results.push({
          displayName: newUser.displayName ?? member.displayName,
          email: member.email,
          phone: member.phone,
          created: true,
          added: true,
          // only expose tempPassword for random mode (shared password admin already knows)
          tempPassword: dto.passwordMode === 'random' ? tempPassword : undefined,
        });
      } catch (err: any) {
        results.push({ displayName: member.displayName, email: member.email, phone: member.phone, created: false, added: false, error: err?.message ?? 'Unknown error' });
      }
    }

    return { results };
  }

  async canAccessGroup(groupId: string, userId?: string) {
    if (!userId) return false;
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    return membership?.status === 'ACCEPTED';
  }

  async canManageGroupContent(groupId: string | undefined | null, user: User) {
    if (user.role === 'ADMIN') return true;
    if (!groupId) return false;
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    return membership?.status === 'ACCEPTED' && membership.role === 'GROUP_ADMIN';
  }

  private async assertCanManageGroupSettings(groupId: string, user: User) {
    if (user.role === 'ADMIN') return;
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    const can = membership?.status === 'ACCEPTED' && membership.role === 'GROUP_ADMIN';
    if (!can) throw new ForbiddenException('You do not have permission to update group settings.');
  }

  /** Any accepted group member (or platform admin) can send invites. */
  private async assertCanSendInvites(groupId: string, user: User) {
    if (user.role === 'ADMIN') return;
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    const can = membership?.status === 'ACCEPTED';
    if (!can) throw new ForbiddenException('You must be a group member to send invitations.');
  }

  private async assertCanReviewJoinRequests(groupId: string, user: User) {
    if (user.role === 'ADMIN') return;
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    const can = membership?.status === 'ACCEPTED' && membership.role === 'GROUP_ADMIN';
    if (!can) throw new ForbiddenException('You do not have permission to review join requests.');
  }

  private assertPlatformAdmin(user: User) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Platform admin required.');
    }
  }

  private async ensureGroupExists(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found.');
    return group;
  }

  private async notifyAdminsInviteAccepted(groupId: string, newMember: User) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    if (!group) return;
    const admins = await this.prisma.groupMembership.findMany({
      where: { groupId, role: 'GROUP_ADMIN', status: 'ACCEPTED', userId: { not: newMember.id } },
      select: { userId: true },
    });
    if (!admins.length) return;
    const memberName = (newMember as any).displayName || newMember.email || 'Someone';
    await this.notifications.createMany(
      admins.map((a) => ({
        userId: a.userId,
        type: 'INVITE_ACCEPTED' as const,
        title_en: `${memberName} joined ${group.name}`,
        title_zh: `${memberName} 已加入 ${group.name}`,
        body_en: `${memberName} accepted their invitation and joined the group.`,
        body_zh: `${memberName} 已接受邀請並加入群組。`,
        actionUrl: `/admin/groups/${groupId}/settings`,
        groupId,
      })),
    );
  }

  // Notify a newly-added member of upcoming events they may have missed (up to 5, next 60 days).
  // Called fire-and-forget after membership is set to ACCEPTED.
  private async notifyMemberOfUpcomingEvents(groupId: string, userId: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const events = await this.prisma.event.findMany({
      where: { groupId, startAt: { gte: now, lte: cutoff } },
      orderBy: { startAt: 'asc' },
      take: 5,
    });
    if (!events.length) return;
    await this.notifications.createMany(
      events.map((ev) => ({
        userId,
        type: 'NEW_EVENT' as const,
        title_en: `Upcoming: ${ev.title}`,
        title_zh: `即將到來：${ev.title}`,
        body_en: new Date(ev.startAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
        body_zh: new Date(ev.startAt).toLocaleDateString('zh-TW', { dateStyle: 'medium' }),
        actionUrl: `/events/${ev.id}`,
        groupId,
        eventId: ev.id,
      })),
    );
  }

  // ─── Subgroups ───────────────────────────────────────────────────────────────

  async subgroups(groupId: string) {
    await this.ensureGroupExists(groupId);
    return this.prisma.group.findMany({
      where: { parentGroupId: groupId },
      include: {
        subgroups: { select: { id: true, name: true } },
        _count: { select: { memberships: { where: { status: 'ACCEPTED' } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async groupRelationships(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        parentGroup: { select: { id: true, name: true, parentGroupId: true } },
        subgroups: {
          select: {
            id: true,
            name: true,
            description: true,
            subgroups: { select: { id: true, name: true, description: true }, orderBy: { name: 'asc' } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const lineage = await this.buildLineage(groupId);

    const parentGroup = group.parentGroup
      ? { id: group.parentGroup.id, name: group.parentGroup.name }
      : null;
    const subgroups = group.subgroups.map((sg) => ({ id: sg.id, name: sg.name, description: sg.description }));

    return {
      parentGroup,
      subgroups,
      lineage,
      tree: group.subgroups.map((sg) => ({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        children: sg.subgroups,
      })),
    };
  }

  async setParentGroup(groupId: string, dto: SetParentGroupDto, user: User) {
    const group = await this.ensureGroupExists(groupId);

    // Direct parent assignment now requires the request/approval flow.
    if (dto.parentGroupId) {
      throw new ForbiddenException('Use relationship requests to link parent/child groups.');
    }

    // Allow unlink if actor is platform admin, source creator, or current parent creator.
    let canUnlink = user.role === 'ADMIN' || group.createdById === user.id;
    if (!canUnlink && group.parentGroupId) {
      const currentParent = await this.prisma.group.findUnique({
        where: { id: group.parentGroupId },
        select: { createdById: true },
      });
      canUnlink = currentParent?.createdById === user.id;
    }

    if (!canUnlink) {
      throw new ForbiddenException('Only relevant group creators can remove this parent/child link.');
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { parentGroupId: null },
    });
  }

  async createRelationshipRequest(groupId: string, dto: CreateGroupRelationshipRequestDto, user: User) {
    const sourceGroup = await this.ensureGroupExists(groupId);
    const targetGroup = await this.ensureGroupExists(dto.parentGroupId);

    if (sourceGroup.id === targetGroup.id) {
      throw new BadRequestException('A group cannot be its own parent.');
    }

    // Request can be initiated by source creator, target creator, or platform admin.
    const canRequest =
      user.role === 'ADMIN' ||
      sourceGroup.createdById === user.id ||
      targetGroup.createdById === user.id;
    if (!canRequest) {
      throw new ForbiddenException('Only involved group creators can request this relationship.');
    }

    if (sourceGroup.parentGroupId === targetGroup.id) {
      throw new BadRequestException('These groups are already linked with this parent relationship.');
    }

    await this.assertNoHierarchyCycle(sourceGroup.id, targetGroup.id);
    await this.assertDepthWithinLimit(sourceGroup.id, targetGroup.id);

    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "GroupRelationshipRequest"
      WHERE "sourceGroupId" = ${sourceGroup.id}
        AND "targetGroupId" = ${targetGroup.id}
        AND status = 'PENDING'
      LIMIT 1
    `;
    if (existing.length > 0) {
      throw new ConflictException('A pending relationship request already exists for these groups.');
    }

    const relationshipRequestId = `grpr_${randomBytes(16).toString('hex')}`;

    const created = await this.prisma.$queryRaw<Array<{ id: string; status: string; createdAt: Date }>>`
      INSERT INTO "GroupRelationshipRequest" (
        id,
        "sourceGroupId",
        "targetGroupId",
        "requesterUserId",
        status,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${relationshipRequestId},
        ${sourceGroup.id},
        ${targetGroup.id},
        ${user.id},
        'PENDING',
        NOW(),
        NOW()
      )
      RETURNING id, status, "createdAt"
    `;

    // Notify target group creator for approval.
    await this.notifications.create({
      userId: targetGroup.createdById,
      type: 'JOIN_REQUEST_RECEIVED',
      title_en: `Group relationship request for ${targetGroup.name}`,
      title_zh: `${targetGroup.name} 有群組層級申請`,
      body_en: `${sourceGroup.name} requested to be linked under ${targetGroup.name}.`,
      body_zh: `${sourceGroup.name} 申請與 ${targetGroup.name} 建立父子群組關係。`,
      actionUrl: `/admin/groups/${targetGroup.id}/settings`,
      groupId: targetGroup.id,
      requestId: created[0].id,
    });

    return {
      id: created[0].id,
      status: created[0].status,
      sourceGroup: { id: sourceGroup.id, name: sourceGroup.name },
      targetGroup: { id: targetGroup.id, name: targetGroup.name },
      createdAt: created[0].createdAt,
    };
  }

  async listRelationshipRequests(groupId: string, user: User) {
    const currentGroup = await this.ensureGroupExists(groupId);

    const canView =
      user.role === 'ADMIN' ||
      currentGroup.createdById === user.id ||
      (await this.prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
        select: { role: true, status: true },
      }).then((m) => m?.status === 'ACCEPTED' && m.role === 'GROUP_ADMIN'));

    if (!canView) {
      throw new ForbiddenException('You do not have permission to view relationship requests for this group.');
    }

    const incoming = await this.prisma.$queryRaw<Array<{
      id: string;
      status: string;
      createdAt: Date;
      sourceGroupId: string;
      sourceGroupName: string;
      targetGroupId: string;
      targetGroupName: string;
      requesterUserId: string;
      requesterDisplayName: string | null;
      requesterEmail: string | null;
    }>>`
      SELECT
        r.id,
        r.status,
        r."createdAt",
        r."sourceGroupId",
        s.name AS "sourceGroupName",
        r."targetGroupId",
        t.name AS "targetGroupName",
        r."requesterUserId",
        u."displayName" AS "requesterDisplayName",
        u.email AS "requesterEmail"
      FROM "GroupRelationshipRequest" r
      JOIN "Group" s ON s.id = r."sourceGroupId"
      JOIN "Group" t ON t.id = r."targetGroupId"
      JOIN "User" u ON u.id = r."requesterUserId"
      WHERE r."targetGroupId" = ${groupId}
      ORDER BY r."createdAt" DESC
    `;

    const outgoing = await this.prisma.$queryRaw<Array<{
      id: string;
      status: string;
      createdAt: Date;
      sourceGroupId: string;
      sourceGroupName: string;
      targetGroupId: string;
      targetGroupName: string;
      requesterUserId: string;
      requesterDisplayName: string | null;
      requesterEmail: string | null;
    }>>`
      SELECT
        r.id,
        r.status,
        r."createdAt",
        r."sourceGroupId",
        s.name AS "sourceGroupName",
        r."targetGroupId",
        t.name AS "targetGroupName",
        r."requesterUserId",
        u."displayName" AS "requesterDisplayName",
        u.email AS "requesterEmail"
      FROM "GroupRelationshipRequest" r
      JOIN "Group" s ON s.id = r."sourceGroupId"
      JOIN "Group" t ON t.id = r."targetGroupId"
      JOIN "User" u ON u.id = r."requesterUserId"
      WHERE r."sourceGroupId" = ${groupId}
      ORDER BY r."createdAt" DESC
    `;

    return {
      incoming,
      outgoing,
      canReviewIncoming: currentGroup.createdById === user.id,
    };
  }

  async reviewRelationshipRequest(requestId: string, dto: ReviewGroupRelationshipRequestDto, user: User) {
    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      status: string;
      sourceGroupId: string;
      targetGroupId: string;
      requesterUserId: string;
    }>>`
      SELECT id, status, "sourceGroupId", "targetGroupId", "requesterUserId"
      FROM "GroupRelationshipRequest"
      WHERE id = ${requestId}
      LIMIT 1
    `;

    if (!rows.length) throw new NotFoundException('Relationship request not found.');
    const req = rows[0];

    if (req.status !== 'PENDING') {
      throw new BadRequestException('Relationship request has already been resolved.');
    }

    const targetGroup = await this.prisma.group.findUnique({
      where: { id: req.targetGroupId },
      select: { id: true, name: true, createdById: true },
    });
    const sourceGroup = await this.prisma.group.findUnique({
      where: { id: req.sourceGroupId },
      select: { id: true, name: true },
    });
    if (!targetGroup || !sourceGroup) throw new NotFoundException('Group not found.');

    if (targetGroup.createdById !== user.id) {
      throw new ForbiddenException('Only the target group creator can approve this request.');
    }

    if (dto.action === 'approve') {
      await this.assertNoHierarchyCycle(req.sourceGroupId, req.targetGroupId);
      await this.assertDepthWithinLimit(req.sourceGroupId, req.targetGroupId);

      await this.prisma.$transaction(async (tx) => {
        await tx.group.update({
          where: { id: req.sourceGroupId },
          data: { parentGroupId: req.targetGroupId },
        });

        await tx.$executeRaw`
          UPDATE "GroupRelationshipRequest"
          SET status = 'APPROVED',
              "reviewedByUserId" = ${user.id},
              "reviewedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE id = ${requestId}
        `;
      });

      await this.notifications.create({
        userId: req.requesterUserId,
        type: 'JOIN_REQUEST_APPROVED',
        title_en: `Group relationship approved`,
        title_zh: `群組層級申請已核准`,
        body_en: `${sourceGroup.name} is now linked under ${targetGroup.name}.`,
        body_zh: `${sourceGroup.name} 已連結為 ${targetGroup.name} 的子群組。`,
        actionUrl: `/admin/groups/${sourceGroup.id}/settings`,
        groupId: sourceGroup.id,
        requestId,
      });

      return { id: requestId, status: 'APPROVED' };
    }

    await this.prisma.$executeRaw`
      UPDATE "GroupRelationshipRequest"
      SET status = 'REJECTED',
          "reviewedByUserId" = ${user.id},
          "reviewedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${requestId}
    `;

    await this.notifications.create({
      userId: req.requesterUserId,
      type: 'JOIN_REQUEST_REJECTED',
      title_en: `Group relationship rejected`,
      title_zh: `群組層級申請被拒絕`,
      body_en: `Your request to link ${sourceGroup.name} under ${targetGroup.name} was rejected.`,
      body_zh: `您將 ${sourceGroup.name} 連結到 ${targetGroup.name} 的申請已被拒絕。`,
      actionUrl: `/admin/groups/${sourceGroup.id}/settings`,
      groupId: sourceGroup.id,
      requestId,
    });

    return { id: requestId, status: 'REJECTED' };
  }

  private async assertNoHierarchyCycle(groupId: string, parentGroupId: string) {
    let cursor: string | null = parentGroupId;
    while (cursor) {
      if (cursor === groupId) {
        throw new BadRequestException('Circular group relationships are not allowed.');
      }
      const row: { parentGroupId: string | null } | null = await this.prisma.group.findUnique({
        where: { id: cursor },
        select: { parentGroupId: true },
      });
      cursor = row?.parentGroupId ?? null;
    }
  }

  private async assertDepthWithinLimit(groupId: string, newParentGroupId: string) {
    const groups = await this.prisma.group.findMany({
      select: { id: true, parentGroupId: true },
    });
    const byId = new Map(groups.map((g) => [g.id, g.parentGroupId]));

    const childMap = new Map<string, string[]>();
    for (const g of groups) {
      if (!g.parentGroupId) continue;
      const arr = childMap.get(g.parentGroupId) ?? [];
      arr.push(g.id);
      childMap.set(g.parentGroupId, arr);
    }

    const parentDepth = this.computeNodeDepth(newParentGroupId, byId);
    const subtreeHeight = this.computeSubtreeHeight(groupId, childMap);
    const deepestDepthAfterMove = parentDepth + subtreeHeight;
    if (deepestDepthAfterMove > 3) {
      throw new BadRequestException('Group hierarchy supports at most 3 levels.');
    }
  }

  private computeNodeDepth(nodeId: string, parentById: Map<string, string | null>) {
    let depth = 1;
    let cursor = parentById.get(nodeId) ?? null;
    while (cursor) {
      depth += 1;
      cursor = parentById.get(cursor) ?? null;
    }
    return depth;
  }

  private computeSubtreeHeight(rootId: string, childMap: Map<string, string[]>): number {
    const children = childMap.get(rootId) ?? [];
    if (children.length === 0) return 1;
    const childHeights: number[] = children.map((childId) => this.computeSubtreeHeight(childId, childMap));
    return 1 + Math.max(...childHeights);
  }

  private async buildLineage(groupId: string) {
    const lineage: Array<{ id: string; name: string }> = [];
    let cursor: string | null = groupId;

    while (cursor) {
      const current: { id: string; name: string; parentGroupId: string | null } | null = await this.prisma.group.findUnique({
        where: { id: cursor },
        select: { id: true, name: true, parentGroupId: true },
      });
      if (!current) break;
      lineage.unshift({ id: current.id, name: current.name });
      cursor = current.parentGroupId;
    }

    return lineage;
  }

  // ─── Import / Export ─────────────────────────────────────────────────────────

  async importMembers(groupId: string, filePath: string, user: User) {
    this.assertPlatformAdmin(user);
    await this.ensureGroupExists(groupId);

    const fs = await import('fs/promises');
    const text = await fs.readFile(filePath, 'utf-8');

    const allLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (allLines.length === 0) return { total: 0, results: [] };

    const parseRow = (line: string) => line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());

    // Detect named header row: look for "email" and/or "phone" column headers
    const firstRow = parseRow(allLines[0]);
    const emailIdx = firstRow.findIndex((h) => /^email$/i.test(h));
    const phoneIdx = firstRow.findIndex((h) => /^(phone|mobile|tel|e164|phonee164)$/i.test(h));
    const hasHeader = emailIdx !== -1 || phoneIdx !== -1;
    const dataLines = hasHeader ? allLines.slice(1) : allLines;

    const results: Array<{ identifier: string; status: 'added' | 'not_found' | 'already_member' }> = [];

    for (const line of dataLines) {
      const cols = parseRow(line);

      // Build candidate identifiers for this row (email preferred over phone)
      let candidates: string[];
      if (hasHeader) {
        candidates = [
          emailIdx !== -1 ? cols[emailIdx] : '',
          phoneIdx !== -1 ? cols[phoneIdx] : '',
        ].filter(Boolean);
      } else {
        // No named header: fall back to first column (plain email or E.164 phone)
        candidates = [cols[0]].filter(Boolean);
      }

      if (candidates.length === 0) continue;
      const displayId = candidates[0];

      let targetUser: Awaited<ReturnType<typeof this.prisma.user.findFirst>> = null;
      for (const id of candidates) {
        targetUser = await this.prisma.user.findFirst({
          where: { OR: [{ email: id }, { phoneE164: id }] },
        });
        if (targetUser) break;
      }

      if (!targetUser) {
        results.push({ identifier: displayId, status: 'not_found' });
        continue;
      }
      const existing = await this.prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: targetUser.id } },
      });
      if (existing?.status === 'ACCEPTED') {
        results.push({ identifier: displayId, status: 'already_member' });
        continue;
      }
      await this.prisma.groupMembership.upsert({
        where: { groupId_userId: { groupId, userId: targetUser.id } },
        create: { groupId, userId: targetUser.id, status: 'ACCEPTED', role: 'GROUP_MEMBER', joinedAt: new Date(), invitedByPlatformAdminId: user.id },
        update: { status: 'ACCEPTED', joinedAt: new Date(), invitedByPlatformAdminId: user.id },
      });
      results.push({ identifier: displayId, status: 'added' });
    }

    return { total: dataLines.length, results };
  }

  async exportMembers(groupId: string, user: User): Promise<{ buffer: Buffer; filename: string }> {
    this.assertPlatformAdmin(user);
    const group = await this.ensureGroupExists(groupId);

    const rows = await this.prisma.groupMembership.findMany({
      where: { groupId, status: 'ACCEPTED' },
      include: { user: { select: { id: true, email: true, phoneE164: true, displayName: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    const csvEscape = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['ID', 'Name', 'Email', 'Phone', 'Role', 'JoinedAt'].map(csvEscape).join(',');
    const lines = rows.map((m) =>
      [m.user.id, m.user.displayName ?? '', m.user.email ?? '', m.user.phoneE164 ?? '', m.role, m.joinedAt ? m.joinedAt.toISOString() : ''].map(csvEscape).join(',')
    );
    const csv = [header, ...lines].join('\r\n');
    return { buffer: Buffer.from(csv, 'utf-8'), filename: `members_${group.pid}.csv` };
  }

  // ─── Donations ───────────────────────────────────────────────────────────────

  async createDonation(
    groupId: string,
    user: User,
    dto: { forUserId: string; amount: number; currency: string; date: string; note?: string },
  ) {
    await this.assertCanManageGroupSettings(groupId, user);
    await this.ensureGroupExists(groupId);
    const member = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: dto.forUserId } },
    });
    if (!member) throw new NotFoundException('Member not found in this group.');
    return this.prisma.donationRecord.create({
      data: {
        groupId,
        forUserId: dto.forUserId,
        amount: dto.amount,
        currency: dto.currency.toUpperCase(),
        date: new Date(dto.date),
        note: dto.note ?? null,
        createdById: user.id,
      },
      include: { forUser: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async listDonations(groupId: string, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    return this.prisma.donationRecord.findMany({
      where: { groupId },
      include: { forUser: { select: { id: true, displayName: true, email: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async deleteDonation(groupId: string, donationId: string, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    const record = await this.prisma.donationRecord.findFirst({
      where: { id: donationId, groupId },
    });
    if (!record) throw new NotFoundException('Donation record not found.');
    await this.prisma.donationRecord.delete({ where: { id: donationId } });
    return { deleted: true };
  }

  // ─── Group Report ─────────────────────────────────────────────────────────────

  async getGroupReport(groupId: string, year: number, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    const group = await this.ensureGroupExists(groupId);

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const [events, allMembers, donations] = await Promise.all([
      this.prisma.event.findMany({
        where: { groupId, startAt: { gte: startOfYear, lt: endOfYear } },
        include: {
          rsvps: { include: { user: { select: { id: true, displayName: true, email: true } } } },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.groupMembership.findMany({
        where: { groupId, status: 'ACCEPTED' },
        include: { user: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.donationRecord.findMany({
        where: { groupId, date: { gte: startOfYear, lt: endOfYear } },
      }),
    ]);

    const memberIds = allMembers.map((m) => m.userId);
    const memberMap: Record<string, { id: string; displayName: string | null; email: string | null }> = {};
    for (const m of allMembers) memberMap[m.userId] = m.user;

    // Per-event breakdown
    const eventBreakdown = events.map((ev) => {
      const rsvpMap: Record<string, string> = {};
      for (const r of ev.rsvps) rsvpMap[r.userId] = r.status;
      return {
        id: ev.id,
        title: ev.title,
        startAt: ev.startAt.toISOString(),
        memberRsvps: memberIds.map((uid) => ({
          userId: uid,
          displayName: memberMap[uid]?.displayName ?? null,
          email: memberMap[uid]?.email ?? '',
          status: (rsvpMap[uid] as 'GOING' | 'MAYBE' | 'NO') ?? null,
        })),
      };
    });

    // Per-member summary
    const memberSummary = memberIds.map((uid) => {
      const totalEvents = events.length;
      const going = events.filter((ev) => ev.rsvps.some((r) => r.userId === uid && r.status === 'GOING')).length;
      const no = events.filter((ev) => ev.rsvps.some((r) => r.userId === uid && r.status === 'NO')).length;
      const usd = donations.filter((d) => d.forUserId === uid && d.currency === 'USD').reduce((s, d) => s + Number(d.amount), 0);
      const ntd = donations.filter((d) => d.forUserId === uid && d.currency === 'NTD').reduce((s, d) => s + Number(d.amount), 0);
      return {
        userId: uid,
        displayName: memberMap[uid]?.displayName ?? null,
        email: memberMap[uid]?.email ?? '',
        totalEvents,
        going,
        no,
        noResponse: totalEvents - going - no,
        attendanceRate: totalEvents > 0 ? Math.round((going / totalEvents) * 100) : 0,
        totalDonatedUSD: usd,
        totalDonatedNTD: ntd,
      };
    });

    return {
      groupName: group.name,
      year,
      totalEvents: events.length,
      totalMembers: allMembers.length,
      events: eventBreakdown,
      members: memberSummary,
    };
  }
}
