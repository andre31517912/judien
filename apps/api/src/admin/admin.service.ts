import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../__generated__/prisma';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, type: 'user' | 'group' | 'news' | 'event' | 'all') {
    const term = q.trim();
    if (!term) return { users: [], groups: [], news: [], events: [] };

    const wantUsers  = type === 'all' || type === 'user';
    const wantGroups = type === 'all' || type === 'group';
    const wantNews   = type === 'all' || type === 'news';
    const wantEvents = type === 'all' || type === 'event';

    const [users, groups, news, events] = await Promise.all([
      wantUsers
        ? this.prisma.user.findMany({
            where: {
              OR: [
                { displayName: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { phoneE164: { contains: term, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              displayName: true,
              email: true,
              phoneE164: true,
              role: true,
              createdAt: true,
              lineUserId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
      wantGroups
        ? this.prisma.group.findMany({
            where: { name: { contains: term, mode: 'insensitive' } },
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              _count: { select: { memberships: true } },
              createdBy: { select: { id: true, displayName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
      wantNews
        ? this.prisma.news.findMany({
            where: {
              OR: [
                { title_en: { contains: term, mode: 'insensitive' } },
                { title_zh: { contains: term, mode: 'insensitive' } },
                { body_en: { contains: term, mode: 'insensitive' } },
                { body_zh: { contains: term, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              title_en: true,
              title_zh: true,
              body_en: true,
              body_zh: true,
              createdAt: true,
              createdBy: { select: { id: true, displayName: true } },
              group: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
      wantEvents
        ? this.prisma.event.findMany({
            where: {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              title: true,
              description: true,
              startAt: true,
              createdAt: true,
              createdBy: { select: { id: true, displayName: true } },
              group: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
    ]);

    return { users, groups, news, events };
  }

  async listUsers(page: number, pageSize: number) {
    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        select: {
          id: true,
          displayName: true,
          email: true,
          phoneE164: true,
          role: true,
          createdAt: true,
          lineUserId: true,
          _count: { select: { groupMemberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, data: users };
  }

  async listGroups(page: number, pageSize: number) {
    const [total, groups] = await Promise.all([
      this.prisma.group.count(),
      this.prisma.group.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          discoverableBySearch: true,
          _count: { select: { memberships: true } },
          createdBy: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, data: groups };
  }

  async deleteUser(targetUserId: string, requestingUser: User) {
    if (targetUserId === requestingUser.id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found.');

    // Must manually clean up all FK references to this user that don't have onDelete: Cascade.
    // Prisma defaults to Restrict for non-cascaded relations, which blocks the delete.

    await this.prisma.$transaction(async (tx) => {
      // 1. Null out optional FKs that reference this user
      await tx.eventInvite.updateMany({ where: { acceptedByUserId: targetUserId }, data: { acceptedByUserId: null } });
      await tx.groupInvite.updateMany({ where: { invitedUserId: targetUserId }, data: { invitedUserId: null } });
      await tx.groupMembership.updateMany({ where: { invitedByPlatformAdminId: targetUserId }, data: { invitedByPlatformAdminId: null } });
      await tx.groupJoinRequest.updateMany({ where: { reviewedByUserId: targetUserId }, data: { reviewedByUserId: null } });

      // 2. Delete records with required (non-nullable) FK to this user
      await tx.messageLog.deleteMany({ where: { userId: targetUserId } });
      await tx.eventInvite.deleteMany({ where: { createdById: targetUserId } });
      await tx.groupInvite.deleteMany({ where: { invitedByPlatformAdminId: targetUserId } });
      await tx.news.deleteMany({ where: { createdById: targetUserId } });

      // 3. Unlink events from any series this user created, then delete those series
      const userSeriesIds = (await tx.eventSeries.findMany({
        where: { createdById: targetUserId },
        select: { id: true },
      })).map((s) => s.id);
      if (userSeriesIds.length) {
        await tx.event.updateMany({ where: { seriesId: { in: userSeriesIds } }, data: { seriesId: null } });
        await tx.eventSeries.deleteMany({ where: { createdById: targetUserId } });
      }

      // 4. Delete events created by this user (cascades RSVP, Comment, GuestRSVP, ReminderRule, EventShareLink)
      await tx.event.deleteMany({ where: { createdById: targetUserId } });

      // 5. Delete groups created by this user — first null out group-level references
      const userGroupIds = (await tx.group.findMany({
        where: { createdById: targetUserId },
        select: { id: true },
      })).map((g) => g.id);
      if (userGroupIds.length) {
        await tx.news.updateMany({ where: { groupId: { in: userGroupIds } }, data: { groupId: null } });
        await tx.eventSeries.updateMany({ where: { groupId: { in: userGroupIds } }, data: { groupId: null } });
        await tx.event.updateMany({ where: { groupId: { in: userGroupIds } }, data: { groupId: null } });
        await tx.group.updateMany({ where: { parentGroupId: { in: userGroupIds } }, data: { parentGroupId: null } });
        await tx.group.deleteMany({ where: { id: { in: userGroupIds } } });
      }

      // 6. Finally delete the user — remaining relations (RSVP, Comment, GroupMembership,
      //    GroupMessage, Notification, DonationRecord, InviteToken, GroupJoinRequest requester,
      //    GroupRelationshipRequest requester, EventShareLink) all have onDelete: Cascade
      await tx.user.delete({ where: { id: targetUserId } });
    });

    return { deleted: true };
  }

  async deleteNews(newsId: string) {
    const post = await this.prisma.news.findUnique({ where: { id: newsId } });
    if (!post) throw new NotFoundException('Post not found.');
    await this.prisma.news.delete({ where: { id: newsId } });
    return { deleted: true };
  }

  async deleteEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    await this.prisma.event.delete({ where: { id: eventId } });
    return { deleted: true };
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found.');
    await this.prisma.$transaction([
      this.prisma.news.updateMany({ where: { groupId }, data: { groupId: null } }),
      this.prisma.eventSeries.updateMany({ where: { groupId }, data: { groupId: null } }),
      this.prisma.event.updateMany({ where: { groupId }, data: { groupId: null } }),
      this.prisma.group.updateMany({ where: { parentGroupId: groupId }, data: { parentGroupId: null } }),
      this.prisma.group.delete({ where: { id: groupId } }),
    ]);
    return { deleted: true };
  }
}
