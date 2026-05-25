import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInviteDto } from '@judien/shared';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: string, dto: CreateInviteDto) {
    const token = randomBytes(24).toString('hex'); // 48-char hex token
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    return this.prisma.inviteToken.create({
      data: { token, role: dto.role, createdById: adminId, expiresAt },
    });
  }

  async findAll(adminId: string) {
    return this.prisma.inviteToken.findMany({
      where: { createdById: adminId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        role: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        usedBy: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async revoke(adminId: string, id: string) {
    const invite = await this.prisma.inviteToken.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Invite not found.');
    if (invite.createdById !== adminId) throw new ForbiddenException();
    await this.prisma.inviteToken.delete({ where: { id } });
  }
}
