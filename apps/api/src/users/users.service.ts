import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

const LINE_EMAIL_SUFFIX = '@line.local';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Omit<User, 'passwordHash'>> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phoneE164: true },
    });

    // Determine resulting email/phone after the update
    const resultingEmail = dto.email !== undefined ? dto.email : current?.email ?? null;
    const resultingPhone = dto.phone !== undefined ? dto.phone : current?.phoneE164 ?? null;

    // A LINE placeholder email is not a real credential — treat it as absent
    const effectiveEmail = resultingEmail && !resultingEmail.endsWith(LINE_EMAIL_SUFFIX) ? resultingEmail : null;

    if (!effectiveEmail && !resultingPhone) {
      throw new BadRequestException('You must keep at least one email or phone number on file.');
    }

    // Check uniqueness conflicts only for non-null new values
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
    if (dto.email !== undefined) data.email = dto.email;     // null clears it
    if (dto.phone !== undefined) data.phoneE164 = dto.phone; // null clears it
    if (dto.displayName !== undefined) data.displayName = dto.displayName || null;
    if (dto.preferredLanguage) data.preferredLanguage = dto.preferredLanguage;
    if (dto.colorTheme !== undefined) data.colorTheme = dto.colorTheme;
    if (dto.muteEmail !== undefined) data.muteEmail = dto.muteEmail;
    if (dto.muteLinePush !== undefined) data.muteLinePush = dto.muteLinePush;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      data.hasPassword = true;
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    const { passwordHash: _, ...safe } = updated;
    return safe;
  }
}
