import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCommentDto, UpdateCommentDto, CommentListQuery, Comment } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

    // Notify event creator on new top-level comment, or parent comment author on reply
    this.notifyCommentPosted(c, event, user).catch(() => {});

    return this.formatComment(c);
  }

  private async notifyCommentPosted(
    comment: { id: string; replyToId: string | null; userId: string },
    event: { id: string; title_en: string; title_zh: string; createdById: string },
    author: User,
  ) {
    const authorName = (author as any).displayName || author.email || 'Someone';
    const eventTitle_en = event.title_en || event.title_zh || 'an event';
    const eventTitle_zh = event.title_zh || event.title_en || '活動';

    if (comment.replyToId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: comment.replyToId },
        select: { userId: true },
      });
      if (parent && parent.userId !== author.id) {
        await this.notifications.create({
          userId: parent.userId,
          type: 'COMMENT_ON_EVENT' as const,
          title_en: `${authorName} replied to your comment`,
          title_zh: `${authorName} 回覆了您的留言`,
          body_en: eventTitle_en,
          body_zh: eventTitle_zh,
          actionUrl: `/events/${event.id}`,
          eventId: event.id,
        });
      }
    } else if (event.createdById !== author.id) {
      await this.notifications.create({
        userId: event.createdById,
        type: 'COMMENT_ON_EVENT' as const,
        title_en: `${authorName} commented on ${eventTitle_en}`,
        title_zh: `${authorName} 在 ${eventTitle_zh} 留言`,
        body_en: eventTitle_en,
        body_zh: eventTitle_zh,
        actionUrl: `/events/${event.id}`,
        eventId: event.id,
      });
    }
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


