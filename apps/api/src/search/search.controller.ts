import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../__generated__/prisma';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T { return user; }
}

@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(new OptionalJwtGuard())
  @Get()
  async search(@Query('q') q = '', @CurrentUser() user?: User) {
    const term = q.trim();
    if (!term) return { users: [], news: [], events: [], groups: [] };

    // Fetch the current user's group memberships so we can filter group content
    const memberGroupIds = user
      ? (
          await this.prisma.groupMembership.findMany({
            where: { userId: user.id, status: 'ACCEPTED' },
            select: { groupId: true },
          })
        ).map((m) => m.groupId)
      : [];

    const [users, news, events, groups] = await Promise.all([
      // Users — search by displayName only (no email/phone exposed)
      this.prisma.user.findMany({
        where: {
          displayName: { contains: term, mode: 'insensitive' },
        },
        select: { id: true, displayName: true },
        orderBy: { displayName: 'asc' },
        take: 10,
      }),

      // Posts — group posts only visible to members
      this.prisma.news.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { body: { contains: term, mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { groupId: null },
                { groupId: { in: memberGroupIds } },
              ],
            },
          ],
        },
        select: {
          id: true, title: true, body: true, createdAt: true,
          createdBy: { select: { displayName: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Events — group events only visible to members
      this.prisma.event.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { groupId: null },
                { groupId: { in: memberGroupIds } },
              ],
            },
          ],
        },
        select: {
          id: true, title: true, description: true, startAt: true,
          createdBy: { select: { displayName: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),

      // Groups — discoverable only
      this.prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
          discoverableBySearch: true,
        },
        select: {
          id: true, name: true, description: true,
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return { users, news, events, groups };
  }
}
