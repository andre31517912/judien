import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SignupSchema, GuestGroupJoinSchema, type SignupDto, type GuestGroupJoinDto } from '@judien/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../__generated__/prisma';

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  // SameSite=None is required for cross-site cookies (web on Vercel, API on Render)
  // SameSite=Lax is fine for local dev (same-site)
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
  path: '/',
};

function safeUser(user: User) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/signup
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  async signup(
    @Body(new ZodValidationPipe(SignupSchema)) dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.signup(dto);
    const tokens = this.authService.issueTokens(user);
    res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);
    return { user: safeUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  // POST /api/auth/login
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const tokens = this.authService.issueTokens(user);
    res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);
    return { user: safeUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  // POST /api/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined =
      req.cookies?.refresh_token ??
      (req.headers['x-refresh-token'] as string | undefined);

    if (!token) throw new UnauthorizedException('No refresh token.');

    const payload = this.authService.verifyRefresh(token);
    // Re-issue using the userId
    const user = { id: payload.sub, email: payload.email, role: payload.role } as User;
    const tokens = this.authService.issueTokens(user);
    res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);
    return { accessToken: tokens.accessToken };
  }

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  // GET /api/auth/me
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: User) {
    return safeUser(user);
  }

  // GET /api/auth/invite/:token — public endpoint to validate an invite token before signup
  @Get('invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.authService.validateInvite(token);
  }

  // POST /api/auth/guest-join — join a group via invite token without creating a full account
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('guest-join')
  async guestJoin(
    @Body(new ZodValidationPipe(GuestGroupJoinSchema)) dto: GuestGroupJoinDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken, groupId, existingAccount } = await this.authService.guestGroupJoin(dto);
    res.cookie('access_token', accessToken, COOKIE_OPTS);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
    return { user: safeUser(user), accessToken, refreshToken, groupId, existingAccount };
  }

  // POST /api/auth/forgot-password — send a magic sign-in link via email or SMS
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email?: string; phone?: string }) {
    if (typeof body.email === 'string' && body.email.trim()) {
      await this.authService.requestMagicLink(body.email.trim());
    } else if (typeof body.phone === 'string' && body.phone.trim()) {
      await this.authService.requestMagicLinkSms(body.phone.trim());
    }
    return { sent: true };
  }

  // GET /api/auth/magic-link?token=xxx — verify magic token, set cookies, redirect to app
  @Get('magic-link')
  async magicLink(@Query('token') token: string, @Res() res: Response) {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    if (!token) return res.redirect(`${webOrigin}/en/login?error=invalid_link`);
    try {
      const user = await this.authService.verifyMagicLink(token);
      const tokens = this.authService.issueTokens(user);
      res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
      res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);
      const locale = user.preferredLanguage ?? 'en';
      return res.redirect(`${webOrigin}/${locale}/events`);
    } catch {
      return res.redirect(`${webOrigin}/en/login?error=invalid_link`);
    }
  }
}
