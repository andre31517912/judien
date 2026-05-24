import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string | null;
  role: string;
  type: 'access' | 'refresh';
}

function extractTokenFromCookieOrBearer(req: Request): string | null {
  // 1. httpOnly cookie (web)
  if (req.cookies?.access_token) return req.cookies.access_token as string;
  // 2. Authorization: Bearer <token> (mobile)
  const auth = req.headers.authorization ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractTokenFromCookieOrBearer]),
      secretOrKey: process.env.JWT_SECRET ?? 'change_me_in_production',
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
