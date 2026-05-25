import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationType, User } from '../__generated__/prisma';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title_en: string;
  title_zh: string;
  body_en?: string;
  body_zh?: string;
  actionUrl?: string;
  groupId?: string;
  eventId?: string;
  requestId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return;
    return this.prisma.notification.createMany({ data: inputs });
  }

  async list(user: User) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        group: { select: { id: true, name: true } },
      },
    });
  }

  async unreadCount(user: User): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    return { count };
  }

  async markRead(id: string, user: User) {
    // Only update if belongs to user
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
    return { ok: true };
  }

  async markAllRead(user: User) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  async deleteOne(id: string, user: User) {
    await this.prisma.notification.deleteMany({
      where: { id, userId: user.id },
    });
    return { ok: true };
  }

  async deleteAll(user: User) {
    await this.prisma.notification.deleteMany({
      where: { userId: user.id },
    });
    return { ok: true };
  }
}
