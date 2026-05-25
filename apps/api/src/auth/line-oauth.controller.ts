import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../__generated__/prisma';

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

function getSecret() {
  return process.env.JWT_SECRET ?? 'change_me_in_production';
}

/**
 * State format: base64url( "{type}:{id}:{ts}:{sig}" )
 *   type = 'link' (authenticated user linking LINE) | 'login' (unauthenticated LINE login)
 *   id   = userId for 'link', random nonce for 'login'
 */
function signState(type: 'link' | 'login', id: string): string {
  const ts = Date.now();
  const data = `${type}:${id}:${ts}`;
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('hex')
    .slice(0, 16);
  return Buffer.from(`${data}:${sig}`).toString('base64url');
}

type StateResult =
  | { type: 'link'; userId: string }
  | { type: 'login'; nonce: string }
  | null;

function verifyState(state: string): StateResult {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) return null;
    const [type, id, ts, sig] = parts;
    if (Date.now() - parseInt(ts) > 15 * 60 * 1000) return null;
    const data = `${type}:${id}:${ts}`;
    const expected = crypto
      .createHmac('sha256', getSecret())
      .update(data)
      .digest('hex')
      .slice(0, 16);
    if (sig !== expected) return null;
    if (type === 'link') return { type: 'link', userId: id };
    if (type === 'login') return { type: 'login', nonce: id };
    return null;
  } catch {
    return null;
  }
}

@Controller('auth/line')
export class LineOAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * GET /api/auth/line/connect
   * Returns the LINE OAuth URL for linking LINE to an already-authenticated user.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('connect')
  getConnectUrl(@CurrentUser() user: User) {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !redirectUri) {
      return { error: 'LINE_LOGIN_CHANNEL_ID or LINE_REDIRECT_URI not configured.' };
    }

    const state = signState('link', user.id);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state,
      scope: 'profile',
    });

    return { url: `${LINE_AUTH_URL}?${params.toString()}` };
  }

  /**
   * GET /api/auth/line/login
   * Returns the LINE OAuth URL for unauthenticated users (find-or-create account via LINE).
   */
  @Get('login')
  getLoginUrl() {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !redirectUri) {
      return { error: 'LINE_LOGIN_CHANNEL_ID or LINE_REDIRECT_URI not configured.' };
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const state = signState('login', nonce);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state,
      scope: 'profile',
    });

    return { url: `${LINE_AUTH_URL}?${params.toString()}` };
  }

  /**
   * GET /api/auth/line/callback
   * LINE redirects here after authorization.
   * Handles both link mode (attach LINE to existing account) and login mode (sign in via LINE).
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const errorRedirect = (reason: string) =>
      res.redirect(`${webOrigin}/en/profile?line=error&reason=${encodeURIComponent(reason)}`);

    if (!code || !state) return errorRedirect('missing_params');

    const parsed = verifyState(state);
    if (!parsed) return errorRedirect('invalid_state');

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !channelSecret || !redirectUri) {
      return errorRedirect('server_misconfigured');
    }

    try {
      // Exchange auth code for LINE access token
      const tokenRes = await fetch(LINE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: channelId,
          client_secret: channelSecret,
        }).toString(),
      });

      if (!tokenRes.ok) return errorRedirect('token_exchange_failed');
      const tokenData = (await tokenRes.json()) as { access_token: string };

      // Fetch LINE profile (userId + displayName)
      const profileRes = await fetch(LINE_PROFILE_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) return errorRedirect('profile_fetch_failed');
      const profile = (await profileRes.json()) as { userId: string; displayName: string };

      if (parsed.type === 'link') {
        // ---- Link mode: attach LINE ID to the authenticated user ----
        const { userId } = parsed;

        const existingLink = await this.prisma.user.findUnique({
          where: { lineUserId: profile.userId },
        });
        if (existingLink && existingLink.id !== userId) {
          return errorRedirect('line_account_already_linked');
        }

        await this.prisma.user.update({
          where: { id: userId },
          data: { lineUserId: profile.userId },
        });

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const locale = user?.preferredLanguage ?? 'en';
        return res.redirect(`${webOrigin}/${locale}/profile?line=linked`);
      } else {
        // ---- Login mode: find or create account via LINE ID ----
        let user = await this.prisma.user.findUnique({
          where: { lineUserId: profile.userId },
        });

        if (!user) {
          // No account linked to this LINE ID — create a minimal guest account
          const passwordHash = await bcrypt.hash(
            crypto.randomBytes(16).toString('hex'),
            10,
          );
          user = await this.prisma.user.create({
            data: {
              lineUserId: profile.userId,
              displayName: profile.displayName,
              email: `line_${profile.userId}@line.local`,
              passwordHash,
              isGuest: true,
              role: 'USER',
            },
          });
        }

        const tokens = this.authService.issueTokens(user);
        res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
        res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);
        const locale = user.preferredLanguage ?? 'en';
        return res.redirect(`${webOrigin}/${locale}/`);
      }
    } catch {
      return errorRedirect('unexpected_error');
    }
  }

  /**
   * DELETE /api/auth/line/connect
   * Unlinks the LINE account from the authenticated user.
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete('connect')
  async unlink(@CurrentUser() user: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lineUserId: null },
    });
    return { unlinked: true };
  }
}
