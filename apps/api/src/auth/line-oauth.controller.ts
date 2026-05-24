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
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../__generated__/prisma';

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

function signState(userId: string): string {
  const ts = Date.now();
  const data = `${userId}:${ts}`;
  const sig = crypto
    .createHmac('sha256', process.env.JWT_SECRET ?? 'change_me_in_production')
    .update(data)
    .digest('hex')
    .slice(0, 16);
  return Buffer.from(`${data}:${sig}`).toString('base64url');
}

function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userId, ts, sig] = parts;
    // Expire state after 15 minutes
    if (Date.now() - parseInt(ts) > 15 * 60 * 1000) return null;
    const data = `${userId}:${ts}`;
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET ?? 'change_me_in_production')
      .update(data)
      .digest('hex')
      .slice(0, 16);
    return sig === expected ? userId : null;
  } catch {
    return null;
  }
}

@Controller('auth/line')
export class LineOAuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/auth/line/connect
   * Returns the LINE OAuth authorization URL for the authenticated user.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('connect')
  getConnectUrl(@CurrentUser() user: User) {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !redirectUri) {
      return { error: 'LINE_LOGIN_CHANNEL_ID or LINE_REDIRECT_URI not configured.' };
    }

    const state = signState(user.id);
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
   * LINE redirects here after the user authorizes.
   * Exchanges the code for a LINE user ID and stores it on the user record.
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

    const userId = verifyState(state);
    if (!userId) return errorRedirect('invalid_state');

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !channelSecret || !redirectUri) {
      return errorRedirect('server_misconfigured');
    }

    try {
      // Exchange code for access token
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

      // Get LINE user profile
      const profileRes = await fetch(LINE_PROFILE_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) return errorRedirect('profile_fetch_failed');
      const profile = (await profileRes.json()) as { userId: string; displayName: string };

      // Store LINE user ID (handle if already taken by another account)
      const existing = await this.prisma.user.findUnique({
        where: { lineUserId: profile.userId },
      });
      if (existing && existing.id !== userId) {
        return errorRedirect('line_account_already_linked');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { lineUserId: profile.userId },
      });

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const locale = user?.preferredLanguage ?? 'en';
      return res.redirect(`${webOrigin}/${locale}/profile?line=linked`);
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
