import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCommentDto, UpdateCommentDto, CommentListQuery, Comment } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatComment(c: any): Comment {
    return {
      id: c.id,
      eventId: c.eventId,
      userId: c.userId,
      userHandle: c.user.displayName ?? c.user.email,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      deletedAt: c.deletedAt?.toISOString() ?? null,
      replyToId: c.replyToId ?? undefined,
    };
  }

  async list(eventId: string, query: CommentListQuery) {
    const skip = (query.page - 1) * query.pageSize;

    // Get top-level comments (replyToId is null)
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { eventId, deletedAt: null, replyToId: null },
        orderBy: { createdAt: 'asc' },
        skip,
        take: query.pageSize,
        include: { 
          user: { select: { id: true, email: true, displayName: true } },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, email: true, displayName: true } } },
          },
        },
      }),
      this.prisma.comment.count({ where: { eventId, deletedAt: null, replyToId: null } }),
    ]);

    const data = comments.map((c) => ({
      ...this.formatComment(c),
      replies: c.replies.map((r) => this.formatComment(r)),
    }));

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(eventId: string, user: User, dto: CreateCommentDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (!event.commentsEnabled) {
      throw new ForbiddenException('Comments are disabled for this event.');
    }

    // If replying to another comment, validate the parent comment exists and belongs to same event
    if (dto.replyToId) {
      const parentComment = await this.prisma.comment.findUnique({ where: { id: dto.replyToId } });
      if (!parentComment || parentComment.eventId !== eventId || parentComment.deletedAt) {
        throw new NotFoundException('Parent comment not found.');
      }
    }

    const c = await this.prisma.comment.create({
      data: { 
        eventId, 
        userId: user.id, 
        body: dto.body,
        replyToId: dto.replyToId ?? null,
      },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    
    return this.formatComment(c);
  }

  /** Edit own comment only */
  async update(id: string, requestor: User, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ 
      where: { id },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found.');
    if (comment.userId !== requestor.id) throw new ForbiddenException();
    const c = await this.prisma.comment.update({ 
      where: { id }, 
      data: { body: dto.body },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    return this.formatComment(c);
  }

  /** Soft-delete own comment or admin deletes any */
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


