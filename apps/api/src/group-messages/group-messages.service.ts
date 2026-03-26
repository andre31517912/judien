import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGroupMessageDto, GroupMessageListQuery, GroupMessage } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class GroupMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private formatMessage(m: any): GroupMessage {
    return {
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      userHandle: m.user.displayName ?? m.user.email,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  async list(groupId: string, user: User | null, query: GroupMessageListQuery) {
    // Verify the group exists and user has access
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found.');

    // If user is not admin, verify they're a member of the group
    if (user && user.role !== 'ADMIN') {
      const membership = await this.prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });
      if (!membership || membership.status !== 'ACCEPTED') {
        throw new ForbiddenException('You do not have access to this group.');
      }
    } else if (!user) {
      // Non-authenticated users cannot access group chat
      throw new ForbiddenException('Authentication required.');
    }

    const skip = (query.page - 1) * query.pageSize;

    const [messages, total] = await Promise.all([
      this.prisma.groupMessage.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: query.pageSize,
        include: { user: { select: { id: true, email: true, displayName: true } } },
      }),
      this.prisma.groupMessage.count({ where: { groupId } }),
    ]);

    const data = messages.map((m) => this.formatMessage(m));

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(groupId: string, user: User, dto: CreateGroupMessageDto) {
    // Verify the group exists
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found.');

    // Verify user is a member of the group
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (!membership || membership.status !== 'ACCEPTED') {
      throw new ForbiddenException('You must be a member of the group to send messages.');
    }

    const message = await this.prisma.groupMessage.create({
      data: {
        groupId,
        userId: user.id,
        body: dto.body,
      },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });

    return this.formatMessage(message);
  }

  async delete(messageId: string, user: User) {
    const message = await this.prisma.groupMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found.');

    // Only the message owner or admin can delete
    if (user.role !== 'ADMIN' && message.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own messages.');
    }

    await this.prisma.groupMessage.delete({ where: { id: messageId } });
  }
}
