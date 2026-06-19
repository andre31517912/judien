import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import type { NotificationType, User } from '../__generated__/prisma';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  groupId?: string;
  eventId?: string;
  requestId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async create(input: CreateNotificationInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { muteInAppNotifications: true },
    });
    if ((user as any)?.muteInAppNotifications) return null;
    const notification = await this.prisma.notification.create({ data: input });
    return notification;
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return;
    const userIds = [...new Set(inputs.map((i) => i.userId))];
    const mutedUsers = await this.prisma.user.findMany({
      where: { id: { in: userIds }, muteInAppNotifications: true } as any,
      select: { id: true },
    });
    const mutedSet = new Set(mutedUsers.map((u) => u.id));
    const filtered = inputs.filter((i) => !mutedSet.has(i.userId));
    if (!filtered.length) return;
    const result = await this.prisma.notification.createMany({ data: filtered });
    return result;
  }

  // LINE push disabled — re-enable when LINE Messaging API is active
  // private async sendLinePushForNotification(input: CreateNotificationInput) {
  //   try {
  //     const user = await this.prisma.user.findUnique({
  //       where: { id: input.userId },
  //       select: { lineUserId: true, muteLinePush: true, preferredLanguage: true },
  //     });
  //     if (!user?.lineUserId || user.muteLinePush) return;
  //     const lang = user.preferredLanguage === 'zh' ? 'zh' : 'en';
  //     const title = lang === 'zh' ? input.title_zh : input.title_en;
  //     const body = lang === 'zh' ? (input.body_zh ?? '') : (input.body_en ?? '');
  //     const text = body ? `${title}\n${body}` : title;
  //     await this.messaging.sendLine({
  //       userId: input.userId,
  //       to: user.lineUserId,
  //       text,
  //     });
  //   } catch (err) {
  //     this.logger.warn(`LINE push failed for user ${input.userId}: ${err}`);
  //   }
  // }

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
