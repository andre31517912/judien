import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNewsDto, NewsListQuery, UpdateNewsDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async list(query: NewsListQuery, user?: User) {
    if (query.groupId) {
      const canAccess = await this.groupsService.canAccessGroup(query.groupId, user?.id);
      if (!canAccess) throw new ForbiddenException('You do not have access to this group.');
      return this.prisma.news.findMany({
        where: { groupId: query.groupId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!user) {
      return this.prisma.news.findMany({
        where: { groupId: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId: user.id, status: 'ACCEPTED' },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    return this.prisma.news.findMany({
      where: {
        OR: [
          { groupId: null },
          ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateNewsDto, user: User) {
    const canManage = await this.groupsService.canManageGroupContent(dto.groupId, user);
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to post news for this group.');
    }

    return this.prisma.news.create({ data: { ...dto, createdById: user.id } });
  }

  async update(id: string, dto: UpdateNewsDto, user: User) {
    const item = await this.findOrThrow(id);
    if (!item.groupId) {
      throw new ForbiddenException('Global news editing is disabled for this endpoint.');
    }

    const canManage = await this.groupsService.canManageGroupContent(item.groupId, user);
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to update this news post.');
    }

    return this.prisma.news.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: User) {
    const item = await this.findOrThrow(id);
    if (!item.groupId) {
      throw new ForbiddenException('Global news deletion is disabled for this endpoint.');
    }

    const canManage = await this.groupsService.canManageGroupContent(item.groupId, user);
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to delete this news post.');
    }

    await this.prisma.news.delete({ where: { id } });
  }

  private async findOrThrow(id: string) {
    const item = await this.prisma.news.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('News post not found.');
    return item;
  }
}
