import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q = '') {
    const term = q.trim();
    if (!term) return { news: [], events: [], groups: [] };

    const [news, events, groups] = await Promise.all([
      this.prisma.news.findMany({
        where: {
          OR: [
            { title_en: { contains: term, mode: 'insensitive' } },
            { title_zh: { contains: term, mode: 'insensitive' } },
            { body_en: { contains: term, mode: 'insensitive' } },
            { body_zh: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, title_en: true, title_zh: true, body_en: true, body_zh: true, createdAt: true,
          createdBy: { select: { displayName: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
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

    return { news, events, groups };
  }
}
