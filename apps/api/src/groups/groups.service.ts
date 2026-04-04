import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';
import type {
  CreateGroupDto,
  CreateGroupJoinRequestDto,
  InviteGroupMembersDto,
  RespondGroupInviteDto,
  ReviewGroupJoinRequestDto,
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

    const adminIds = Array.from(new Set([user.id, ...dto.adminUserIds]));

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          pid: dto.pid,
          name: dto.name,
          description: dto.description ?? '',
          discoverableBySearch: dto.discoverableBySearch ?? false,
          memberDataPrivate: dto.memberDataPrivate ?? false,
          createdById: user.id,
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

      return group;
    });
  }

  async myGroups(user: User) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId: user.id, status: 'ACCEPTED' },
      include: { group: true },
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

    return this.prisma.group.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { pid: { contains: q, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { discoverableBySearch: true },
              ...(memberGroupIds.length > 0 ? [{ id: { in: memberGroupIds } }] : []),
            ],
          },
        ],
      },
      orderBy: { name: 'asc' },
      take: 25,
    });
  }

  async updateSettings(groupId: string, dto: UpdateGroupSettingsDto, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
    await this.ensureGroupExists(groupId);
    return this.prisma.group.update({ where: { id: groupId }, data: dto });
  }

  async members(groupId: string, user: User) {
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

    const includeEmailForMembers = !group.memberDataPrivate;

    return rows.map((m) => ({
      userId: m.user.id,
      displayName: m.user.displayName,
      role: m.role,
      joinedAt: m.joinedAt,
      email: isPlatformAdmin || isGroupAdmin || includeEmailForMembers ? m.user.email : null,
      phoneE164: isPlatformAdmin || isGroupAdmin ? m.user.phoneE164 : null,
    }));
  }

  async listInvites(groupId: string, user: User) {
    await this.assertCanManageGroupSettings(groupId, user);
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
    await this.assertCanManageGroupSettings(groupId, user);
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
              role: item.role ?? 'MEMBER',
              invitedByPlatformAdminId: user.id,
            },
            update: {
              status: 'PENDING',
              role: item.role ?? 'MEMBER',
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
          role: existing?.role ?? 'MEMBER',
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
          role: 'MEMBER',
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

  async changeMemberRole(groupId: string, memberUserId: string, role: 'GROUP_ADMIN' | 'MEMBER', user: User) {
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
        role: 'MEMBER',
      },
      update: {
        status: 'REMOVED',
        joinedAt: null,
      },
    });

    return { removed: true };
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
}
