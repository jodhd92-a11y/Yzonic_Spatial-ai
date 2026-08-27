import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Refresh tokens are opaque, rotating, DB-backed values — not JWTs — so there's
 * no passport strategy for them. This guard just ensures the cookie is present;
 * AuthService.refresh() does the actual hash lookup, expiry, and rotation.
 */
@Injectable()
export class RefreshGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Missing refresh token.');
    }
    return true;
  }
}
