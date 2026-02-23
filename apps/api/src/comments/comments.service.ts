import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCommentDto, CommentListQuery } from '@judien/shared';
import type { User } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string, query: CommentListQuery) {
    const skip = (query.page - 1) * query.pageSize;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { eventId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        skip,
        take: query.pageSize,
        include: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.comment.count({ where: { eventId, deletedAt: null } }),
    ]);

    const data = comments.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      userId: c.userId,
      // Redact: show first 3 chars + ***
      userHandle: c.user.email.slice(0, 3) + '***',
      body: c.body,
      createdAt: c.createdAt,
      deletedAt: c.deletedAt,
    }));

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(eventId: string, user: User, dto: CreateCommentDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return this.prisma.comment.create({ data: { eventId, userId: user.id, body: dto.body } });
  }

  /** Soft-delete; admin only */
  async remove(id: string, requestor: User) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found.');
    if (requestor.role !== 'ADMIN' && comment.userId !== requestor.id) {
      throw new ForbiddenException();
    }
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
