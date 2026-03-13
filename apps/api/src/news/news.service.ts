import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNewsDto, UpdateNewsDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateNewsDto, user: User) {
    return this.prisma.news.create({ data: { ...dto, createdById: user.id } });
  }

  async update(id: string, dto: UpdateNewsDto) {
    await this.findOrThrow(id);
    return this.prisma.news.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrThrow(id);
    await this.prisma.news.delete({ where: { id } });
  }

  private async findOrThrow(id: string) {
    const item = await this.prisma.news.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('News post not found.');
    return item;
  }
}
