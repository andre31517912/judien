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
import { MessagingService } from '../messaging/messaging.service';
import type { GuestGroupJoinDto, SignupDto } from '@judien/shared';
import { normalizePhone } from '@judien/shared';
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
    private readonly messaging: MessagingService,
  ) {}

  async signup(dto: SignupDto): Promise<User> {
    // Require a valid invite token — signup is not open to the public
    if (!dto.inviteToken) {
      throw new BadRequestException('An invite token is required to sign up.');
    }
    const invite = await this.prisma.inviteToken.findUnique({ where: { token: dto.inviteToken } });
    if (!invite) throw new BadRequestException('Invalid invite token.');
    if (invite.usedAt) throw new BadRequestException('Invite token has already been used.');
    if (invite.expiresAt <= new Date()) throw new BadRequestException('Invite token has expired.');

    const orConditions = [
      { phoneE164: dto.phone },
      ...(dto.email ? [{ email: dto.email }] : []),
    ];
    const existing = await this.prisma.user.findFirst({ where: { OR: orConditions } });
    if (existing) {
      throw new ConflictException('An account with this email or phone already exists. Please log in instead.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email ?? null,
          passwordHash,
          phoneE164: dto.phone,
          displayName: dto.displayName?.trim() || null,
          preferredLanguage: dto.preferredLanguage,
          role: invite.role,
          hasPassword: true,
        },
      });
      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedById: user.id, usedAt: new Date() },
      });
      return user;
    });
  }

  async validateUser(identifier: string, password: string): Promise<User | null> {
    const trimmed = identifier.trim();
    // Determine if the identifier looks like an email or a phone number
    const isEmail = trimmed.includes('@');
    const user = isEmail
      ? await this.prisma.user.findUnique({ where: { email: trimmed } })
      : await this.prisma.user.findUnique({ where: { phoneE164: trimmed } }) ??
        await this.prisma.user.findUnique({ where: { phoneE164: normalizePhone(trimmed) ?? trimmed } });
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

  async validateInvite(token: string): Promise<{ valid: boolean; role?: string; expiresAt?: Date; createdByName?: string }> {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { createdBy: { select: { displayName: true } } },
    });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
      return { valid: false };
    }
    return {
      valid: true,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdByName: invite.createdBy.displayName ?? undefined,
    };
  }

  /**
   * Send a magic sign-in link to the user's email.
   * Silent if the email isn't registered (avoids leaking account existence).
   */
  async requestMagicLink(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = this.jwt.sign(
      { sub: user.id, type: 'magic' },
      { expiresIn: '15m' },
    );

    const locale = user.preferredLanguage ?? 'en';
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const link = `${apiBase}/api/auth/magic-link?token=${token}`;

    const subject = locale === 'zh' ? '您的登入連結' : 'Your sign-in link';
    const text =
      locale === 'zh'
        ? `點擊以下連結登入（15 分鐘內有效）：\n${link}`
        : `Click the link below to sign in (valid for 15 minutes):\n${link}`;
    const html =
      locale === 'zh'
        ? `<p>點擊以下連結登入（15 分鐘內有效）：</p><p><a href="${link}">登入</a></p>`
        : `<p>Click below to sign in (valid for 15 minutes):</p><p><a href="${link}">Sign in</a></p>`;

    await this.messaging.sendEmail({ userId: user.id, to: email, subject, text, html });
  }

  /**
   * Send a magic sign-in link via SMS to the user's phone.
   * Silent if the phone isn't registered.
   */
  async requestMagicLinkSms(phone: string): Promise<void> {
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    const user = await this.prisma.user.findUnique({ where: { phoneE164: normalized } });
    if (!user) return;

    const token = this.jwt.sign(
      { sub: user.id, type: 'magic' },
      { expiresIn: '15m' },
    );

    const locale = user.preferredLanguage ?? 'en';
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const link = `${apiBase}/api/auth/magic-link?token=${token}`;

    const body =
      locale === 'zh'
        ? `您的登入連結（15 分鐘內有效）：${link}`
        : `Your sign-in link (valid 15 min): ${link}`;

    await this.messaging.sendSms({ userId: user.id, to: normalized, body });
  }

  /**
   * Verify a magic link token and return the associated user.
   */
  async verifyMagicLink(token: string): Promise<User> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify<{ sub: string; type: string }>(token);
    } catch {
      throw new UnauthorizedException('Magic link is invalid or expired.');
    }
    if (payload.type !== 'magic') throw new UnauthorizedException('Invalid token type.');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  /**
   * Guest join: validate a group invite token, create/find a minimal (isGuest) user,
   * accept the group membership, and return JWT tokens.
   */
  async guestGroupJoin(dto: GuestGroupJoinDto): Promise<{ user: User; accessToken: string; refreshToken: string; groupId: string; existingAccount: boolean }> {
    const invite = await this.prisma.groupInvite.findUnique({ where: { token: dto.groupInviteToken } });
    if (!invite) throw new NotFoundException('Invite not found.');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invite is already resolved.');
    if (invite.expiresAt <= new Date()) throw new BadRequestException('Invite has expired.');

    const phone = dto.phoneE164 ?? null;
    // Use provided email, then invite's email, then a placeholder
    const email = dto.email ?? invite.email ?? null;
    const effectiveEmail = email ?? `guest_${randomBytes(6).toString('hex')}@guest.local`;

    // Build lookup conditions from whatever identifiers were provided
    const lookupConditions = [
      ...(phone ? [{ phoneE164: phone }] : []),
      ...(email ? [{ email }] : []),
    ];

    let existingAccount = false;
    let user = lookupConditions.length > 0
      ? await this.prisma.user.findFirst({ where: { OR: lookupConditions } })
      : null;

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 10);
      const displayName = dto.displayName ?? email?.split('@')[0] ?? 'Guest';
      user = await this.prisma.user.create({
        data: {
          email: effectiveEmail,
          passwordHash,
          ...(phone ? { phoneE164: phone } : {}),
          displayName,
          isGuest: false,
          role: 'USER',
        },
      });
    } else {
      existingAccount = true;
      if (dto.displayName && dto.displayName !== user.displayName) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { displayName: dto.displayName },
        });
      }
      // Fill in missing phone/email if newly provided
      if (phone && !user.phoneE164) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { phoneE164: phone } });
      }
      if (email && (!user.email || user.email.endsWith('@guest.local') || user.email.endsWith('@invited.local'))) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { email } });
      }
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
    return { user, ...tokens, groupId: invite.groupId, existingAccount };
  }
}
