import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Omit<User, 'passwordHash'>> {
    // Check conflicts — only check fields actually being changed
    const orConditions: object[] = [];
    if (dto.email) orConditions.push({ email: dto.email });
    if (dto.phone) orConditions.push({ phoneE164: dto.phone });
    if (orConditions.length > 0) {
      const conflict = await this.prisma.user.findFirst({
        where: { AND: [{ id: { not: userId } }, { OR: orConditions }] },
      });
      if (conflict) throw new ConflictException('Email or phone already in use.');
    }

    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email;
    if (dto.phone) data.phoneE164 = dto.phone;
    if (dto.displayName !== undefined) data.displayName = dto.displayName || null;
    if (dto.preferredLanguage) data.preferredLanguage = dto.preferredLanguage;
    if (dto.colorTheme !== undefined) data.colorTheme = dto.colorTheme;
    if (dto.muteSms !== undefined) data.muteSms = dto.muteSms;
    if (dto.muteEmail !== undefined) data.muteEmail = dto.muteEmail;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    const { passwordHash: _, ...safe } = updated;
    return safe;
  }
}
