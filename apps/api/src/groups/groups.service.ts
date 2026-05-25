import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';
import type {
  AddMemberDirectlyDto,
  CreateGroupDto,
  CreateGroupJoinRequestDto,
  InviteGroupMembersDto,
  RespondGroupInviteDto,
  ReviewGroupJoinRequestDto,
  SetParentGroupDto,
  UpdateGroupSettingsDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async create(dto: CreateGroupDto, user: User) {
    this.assertPlatformAdmin(user);

    const duplicate = await this.prisma.group.findUnique({
      where: { name: dto.name.trim() },
    });
    if (duplicate) {
      throw new ConflictException(`A group named "${dto.name}" already exists.`);
    }

    const adminIds = Array.from(new Set([user.id, ...dto.adminUserIds]));

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
          discoverableBySearch: dto.discoverableBySearch ?? false,
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
          invitedByPlatformAdminId: user.id,
        })),
        skipDuplicates: true,
      });

      // Add any initial members (e.g. selected from parent group member list)
      if (dto.initialMemberIds && dto.initialMemberIds.length > 0) {
        const memberIds = dto.initialMemberIds.filter((id) => !adminIds.includes(id));
        if (memberIds.length > 0) {
          await tx.groupMembership.createMany({
            data: memberIds.map((memberId) => ({
              groupId: group.id,
              userId: memberId,
              role: 'GROUP_MEMBER' as const,
              status: 'ACCEPTED' as const,
              joinedAt: new Date(),
              invitedByPlatformAdminId: user.id,
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
      orderBy: { updatedAt: 'desc' },
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

  async search(query: string, user?: User) {
    const q = query.trim();
    if (!q) return [];

    const memberGroupIds = user
      ? (await this.prisma.groupMembership.findMany({
          where: { userId: user.id, status: 'ACCEPTED' },
          select: { groupId: true },
        })).map((m) => m.groupId)
      : [];

    const isPlatformAdmin = user?.role === 'ADMIN';

    return this.prisma.group.findMany({
      where: isPlatformAdmin
        ? { name: { contains: q, mode: 'insensitive' } }
        : {
            AND: [
              { name: { contains: q, mode: 'insensitive' } },
              {
                OR: [
                  { discoverableBySearch: true },
                  ...(memberGroupIds.length > 0 ? [{ id: { in: memberGroupIds } }] : []),
                ],
              },
            ],
          },
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
    if (group.createdById !== user.id) {
      throw new ForbiddenException('Only the group creator can delete this group.');
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
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const directMembers = rows.map((m) => ({
      userId: m.user.id,
      displayName: m.user.displayName,
      role: m.role,
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
          user: { select: { id: true, email: true, phoneE164: true, displayName: true } },
        },
        orderBy: { joinedAt: 'asc' },
      });
      for (const m of childRows) {
        if (!directMemberIds.has(m.user.id)) {
          childMembers.push({
            userId: m.user.id,
            displayName: m.user.displayName,
            role: m.role,
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
        if (phoneE164) {
          await this.messaging.sendSms({
            userId: targetUser?.id ?? user.id,
            to: phoneE164,
            body: `Judien invite: ${inviteLink}`,
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

    return { status: 'ACCEPTED' };
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

    if (dto.action === 'reject') {
      return this.prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
        },
      });
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

    await this.prisma.groupMembership.update({
      where: { groupId_userId: { groupId, userId: memberUserId } },
      data: { role },
    });

    return { updated: true };
  }

  async removeMember(groupId: string, memberUserId: string, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    await this.ensureGroupExists(groupId);

    if (memberUserId === user.id) {
      throw new BadRequestException('You cannot remove yourself from the group using this endpoint.');
    }

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
    if (targetUser.phoneE164) {
      await this.messaging.sendSms({
        userId: targetUser.id,
        to: targetUser.phoneE164,
        body: `You've been added to "${group.name}" on Judien: ${groupLink}`,
      });
    }

    return { added: true, userId: targetUser.id, displayName: targetUser.displayName };
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
    this.assertPlatformAdmin(user);
    await this.ensureGroupExists(groupId);

    if (dto.parentGroupId) {
      if (dto.parentGroupId === groupId) {
        throw new BadRequestException('A group cannot be its own parent.');
      }
      await this.ensureGroupExists(dto.parentGroupId);

      await this.assertNoHierarchyCycle(groupId, dto.parentGroupId);
      await this.assertDepthWithinLimit(groupId, dto.parentGroupId);
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { parentGroupId: dto.parentGroupId },
    });
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
        title: ev.title_en || ev.title_zh,
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
      const maybe = events.filter((ev) => ev.rsvps.some((r) => r.userId === uid && r.status === 'MAYBE')).length;
      const no = events.filter((ev) => ev.rsvps.some((r) => r.userId === uid && r.status === 'NO')).length;
      const usd = donations.filter((d) => d.forUserId === uid && d.currency === 'USD').reduce((s, d) => s + Number(d.amount), 0);
      const ntd = donations.filter((d) => d.forUserId === uid && d.currency === 'NTD').reduce((s, d) => s + Number(d.amount), 0);
      return {
        userId: uid,
        displayName: memberMap[uid]?.displayName ?? null,
        email: memberMap[uid]?.email ?? '',
        totalEvents,
        going,
        maybe,
        no,
        noResponse: totalEvents - going - maybe - no,
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
