import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
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
import { SignupSchema, type SignupDto } from '@judien/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../__generated__/prisma';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
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
    return { user: safeUser(user), accessToken: tokens.accessToken };
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
    return { user: safeUser(user), accessToken: tokens.accessToken };
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
}
