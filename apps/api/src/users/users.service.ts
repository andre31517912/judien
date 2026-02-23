import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from '@judien/shared';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Omit<User, 'passwordHash'>> {
    // Check conflicts
    if (dto.email || dto.phone) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                dto.email ? { email: dto.email } : {},
                dto.phone ? { phoneE164: dto.phone } : {},
              ],
            },
          ],
        },
      });
      if (conflict) throw new ConflictException('Email or phone already in use.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.phone ? { phoneE164: dto.phone } : {}),
        ...(dto.preferredLanguage ? { preferredLanguage: dto.preferredLanguage } : {}),
        ...(dto.notificationsMuted !== undefined
          ? { notificationsMuted: dto.notificationsMuted }
          : {}),
      },
    });
    const { passwordHash: _, ...safe } = updated;
    return safe;
  }
}
