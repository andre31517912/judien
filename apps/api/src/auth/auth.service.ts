import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { GuestGroupJoinDto, SignupDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';
import type { JwtPayload } from './jwt.strategy';

const SALT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phoneE164: dto.phone }] },
    });
    if (existing) {
      throw new ConflictException('Email or phone already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        phoneE164: dto.phone,
        displayName: dto.displayName?.trim() || null,
        preferredLanguage: dto.preferredLanguage,
        role: 'USER',
      },
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  issueTokens(user: User): { accessToken: string; refreshToken: string } {
    const base: Omit<JwtPayload, 'type'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign({ ...base, type: 'access' }, { expiresIn: ACCESS_TTL }),
      refreshToken: this.jwt.sign({ ...base, type: 'refresh' }, { expiresIn: REFRESH_TTL }),
    };
  }

  verifyRefresh(token: string): JwtPayload {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException();
    return payload;
  }

  /**
   * Guest join: validate a group invite token, create/find a minimal (isGuest) user,
   * accept the group membership, and return JWT tokens.
   */
  async guestGroupJoin(dto: GuestGroupJoinDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const invite = await this.prisma.groupInvite.findUnique({ where: { token: dto.groupInviteToken } });
    if (!invite) throw new NotFoundException('Invite not found.');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invite is already resolved.');
    if (invite.expiresAt <= new Date()) throw new BadRequestException('Invite has expired.');

    const phone = dto.phoneE164;
    const email = dto.email ?? invite.email ?? `guest_${randomBytes(6).toString('hex')}@guest.local`;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ phoneE164: phone }, ...(dto.email ? [{ email: dto.email }] : [])] },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          phoneE164: phone,
          displayName: dto.displayName,
          isGuest: true,
          role: 'USER',
        },
      });
    }

    // Accept the group membership
    await this.prisma.$transaction(async (tx) => {
      await tx.groupInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', invitedUserId: user!.id, respondedAt: new Date() },
      });
      await tx.groupMembership.upsert({
        where: { groupId_userId: { groupId: invite.groupId, userId: user!.id } },
        create: { groupId: invite.groupId, userId: user!.id, status: 'ACCEPTED', role: 'GROUP_MEMBER', joinedAt: new Date() },
        update: { status: 'ACCEPTED', joinedAt: new Date() },
      });
    });

    const tokens = this.issueTokens(user);
    return { user, ...tokens };
  }
}
