import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

// Cache Apple public keys for 1 hour
let cachedKeys: any[] | null = null;
let cacheTime = 0;

async function getApplePublicKeys(): Promise<any[]> {
  if (cachedKeys && Date.now() - cacheTime < 3_600_000) return cachedKeys!;
  const res = await fetch(APPLE_JWKS_URL);
  const data = (await res.json()) as { keys: any[] };
  cachedKeys = data.keys;
  cacheTime = Date.now();
  return cachedKeys!;
}

async function verifyAppleToken(identityToken: string, clientId: string): Promise<{ sub: string; email?: string }> {
  const parts = identityToken.split('.');
  if (parts.length !== 3) throw new BadRequestException('Invalid identity token format');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const keys = await getApplePublicKeys();
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) throw new BadRequestException('Apple public key not found for kid: ' + header.kid);

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], 'base64url');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signingInput);
  if (!verifier.verify(pem, signature)) throw new BadRequestException('Apple token signature invalid');

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) throw new BadRequestException('Apple token expired');
  if (payload.iss !== 'https://appleid.apple.com') throw new BadRequestException('Invalid Apple token issuer');
  if (payload.aud !== clientId) throw new BadRequestException('Apple token audience mismatch');
  if (!payload.sub) throw new BadRequestException('Apple token missing sub');

  return { sub: payload.sub as string, email: payload.email as string | undefined };
}

@Controller('auth/apple')
export class AppleAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * POST /api/auth/apple/mobile
   * Receives identityToken from expo-apple-authentication, verifies it against
   * Apple's public keys, then finds or creates a user account.
   */
  @Post('mobile')
  async mobileSignIn(
    @Body() body: {
      identityToken: string;
      fullName?: { givenName?: string | null; familyName?: string | null } | null;
    },
  ) {
    if (!body.identityToken) throw new BadRequestException('identityToken required');

    const bundleId = process.env.APPLE_BUNDLE_ID ?? 'com.judien.app';
    const { sub: appleUserId, email } = await verifyAppleToken(body.identityToken, bundleId);

    let user = await this.prisma.user.findUnique({ where: { appleUserId } });

    if (!user) {
      const given = body.fullName?.givenName ?? '';
      const family = body.fullName?.familyName ?? '';
      const displayName = [given, family].filter(Boolean).join(' ') || null;
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

      user = await this.prisma.user.create({
        data: {
          appleUserId,
          email: email ?? `apple_${appleUserId}@apple.local`,
          displayName,
          passwordHash,
          role: 'USER',
        },
      });
    }

    return this.authService.issueTokens(user);
  }

  /**
   * GET /api/auth/apple/login
   * Returns the Apple OAuth redirect URL for web sign-in.
   * Requires APPLE_SERVICE_ID and APPLE_REDIRECT_URI env vars.
   */
  @Get('login')
  getWebLoginUrl() {
    const clientId = process.env.APPLE_SERVICE_ID;
    const redirectUri = process.env.APPLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return { error: 'Sign in with Apple is not configured on this server.' };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
    });

    return { url: `${APPLE_AUTH_URL}?${params.toString()}` };
  }

  /**
   * POST /api/auth/apple/callback
   * Apple posts here (form_post) after web sign-in.
   * Requires APPLE_SERVICE_ID env var.
   */
  @Post('callback')
  async webCallback(
    @Body() body: { id_token?: string; user?: string; error?: string },
    @Res() res: Response,
  ) {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const clientId = process.env.APPLE_SERVICE_ID;

    if (body.error || !body.id_token || !clientId) {
      return res.redirect(`${webOrigin}/en/login?error=apple_failed`);
    }

    try {
      const { sub: appleUserId, email } = await verifyAppleToken(body.id_token, clientId);

      let user = await this.prisma.user.findUnique({ where: { appleUserId } });

      if (!user) {
        let displayName: string | null = null;
        if (body.user) {
          try {
            const u = JSON.parse(body.user) as { name?: { firstName?: string; lastName?: string } };
            displayName = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(' ') || null;
          } catch {}
        }
        const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        user = await this.prisma.user.create({
          data: {
            appleUserId,
            email: email ?? `apple_${appleUserId}@apple.local`,
            displayName,
            passwordHash,
            role: 'USER',
          },
        });
      }

      const tokens = this.authService.issueTokens(user);
      res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
      res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);
      const locale = user.preferredLanguage ?? 'en';
      return res.redirect(`${webOrigin}/${locale}/events`);
    } catch {
      return res.redirect(`${webOrigin}/en/login?error=apple_failed`);
    }
  }
}
