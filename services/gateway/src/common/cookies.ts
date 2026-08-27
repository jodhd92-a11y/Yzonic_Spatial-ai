import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { parseDurationMs } from './time';

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string; refreshTokenExpiresAt: Date },
): void {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const domain = config.get<string>('COOKIE_DOMAIN');
  const accessTtlMs = parseDurationMs(config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m');

  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    domain: domain || undefined,
    path: '/',
  };

  res.cookie('access_token', tokens.accessToken, { ...base, maxAge: accessTtlMs });
  res.cookie('refresh_token', tokens.refreshToken, {
    ...base,
    maxAge: tokens.refreshTokenExpiresAt.getTime() - Date.now(),
    path: '/auth', // refresh token only needs to be sent to /auth/* routes
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const domain = config.get<string>('COOKIE_DOMAIN');
  res.clearCookie('access_token', { path: '/', domain: domain || undefined });
  res.clearCookie('refresh_token', { path: '/auth', domain: domain || undefined });
}
