import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNewsDto, NewsListQuery, UpdateNewsDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { GroupsService } from '../groups/groups.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly newsInclude = {
    createdBy: { select: { id: true, displayName: true } },
    group: { select: { name: true } },
  };

  async list(query: NewsListQuery, user?: User) {
    const keywordWhere = query.q?.trim()
      ? { OR: [
          { title_en: { contains: query.q.trim(), mode: 'insensitive' as const } },
          { title_zh: { contains: query.q.trim(), mode: 'insensitive' as const } },
          { body_en: { contains: query.q.trim(), mode: 'insensitive' as const } },
          { body_zh: { contains: query.q.trim(), mode: 'insensitive' as const } },
        ] }
      : undefined;

    if (query.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(query.groupId, user?.id);
      if (!canAccess) throw new ForbiddenException('You do not have access to this group.');
      return this.prisma.news.findMany({
        where: keywordWhere ? { AND: [{ groupId: query.groupId }, keywordWhere] } : { groupId: query.groupId },
        orderBy: { createdAt: 'desc' },
        include: this.newsInclude,
      });
    }

    if (!user) {
      return this.prisma.news.findMany({
        where: keywordWhere ? { AND: [{ groupId: null }, keywordWhere] } : { groupId: null },
        orderBy: { createdAt: 'desc' },
        include: this.newsInclude,
      });
    }

    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId: user.id, status: 'ACCEPTED' },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    const visibilityOr = [
      { groupId: null },
      ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
    ];

    return this.prisma.news.findMany({
      where: keywordWhere
        ? { AND: [{ OR: visibilityOr }, keywordWhere] }
        : { OR: visibilityOr },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.newsInclude,
    });
  }

  async create(dto: CreateNewsDto, user: User) {
    if (dto.groupId) {
      // Group announcement: requires GROUP_ADMIN or platform ADMIN
      const canManage = await this.groupsService.canManageGroupContent(dto.groupId, user);
      if (!canManage) {
        throw new ForbiddenException('You do not have permission to post news for this group.');
      }
    }
    // Personal/global announcement (no groupId): any authenticated user can post
    const news = await this.prisma.news.create({ data: { ...dto, createdById: user.id }, include: this.newsInclude });

    // Notify group members (or all users for global news)
    this.notifyNewsPublished(news, user).catch(() => {});

    return news;
  }

  private async notifyNewsPublished(
    news: { id: string; title_en: string; title_zh: string; groupId: string | null; createdById: string },
    author: User,
  ) {
    const authorName = (author as any).displayName || author.email || 'Someone';
    let recipientIds: string[] = [];

    if (news.groupId) {
      const memberships = await this.prisma.groupMembership.findMany({
        where: { groupId: news.groupId, status: 'ACCEPTED', userId: { not: author.id } },
        select: { userId: true },
      });
      recipientIds = memberships.map((m) => m.userId);
    } else {
      // Global news: notify all non-guest users except the author
      const users = await this.prisma.user.findMany({
        where: { isGuest: false, id: { not: author.id } },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
    }

    if (!recipientIds.length) return;

    await this.notificationsService.createMany(
      recipientIds.map((userId) => ({
        userId,
        type: 'NEWS_PUBLISHED' as const,
        title_en: news.title_en || 'New announcement',
        title_zh: news.title_zh || '新公告',
        body_en: `${authorName} published a new post.`,
        body_zh: `${authorName} 發布了新公告。`,
        actionUrl: `/feed`,
        groupId: news.groupId ?? undefined,
      })),
    );
  }

  async update(id: string, dto: UpdateNewsDto, user: User) {
    const item = await this.findOrThrow(id);
    if (item.groupId) {
      // Group announcement: requires GROUP_ADMIN or platform ADMIN
      const canManage = await this.groupsService.canManageGroupContent(item.groupId, user);
      if (!canManage) {
        throw new ForbiddenException('You do not have permission to update this news post.');
      }
    } else {
      // Personal/global announcement: only creator or platform ADMIN
      if (item.createdById !== user.id && user.role !== 'ADMIN') {
        throw new ForbiddenException('You can only edit your own announcements.');
      }
    }
    return this.prisma.news.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: User) {
    const item = await this.findOrThrow(id);
    if (item.groupId) {
      // Group announcement: requires GROUP_ADMIN or platform ADMIN
      const canManage = await this.groupsService.canManageGroupContent(item.groupId, user);
      if (!canManage) {
        throw new ForbiddenException('You do not have permission to delete this news post.');
      }
    } else {
      // Personal/global announcement: only creator or platform ADMIN
      if (item.createdById !== user.id && user.role !== 'ADMIN') {
        throw new ForbiddenException('You can only delete your own announcements.');
      }
    }
    await this.prisma.news.delete({ where: { id } });
  }

  private async findOrThrow(id: string) {
    const item = await this.prisma.news.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('News post not found.');
    return item;
  }
}

