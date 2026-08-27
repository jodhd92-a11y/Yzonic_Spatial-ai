import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpPurpose } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { AuditService } from './audit.service';
import { parseDurationMs } from '../common/time';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// Per-account login lockout — independent of the per-IP rate limit on the
// route itself, so a patient attacker spreading attempts across IPs (or just
// going slowly) still gets stopped after repeated failures on one account.
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;

interface TokenPair {
  accessToken: string;
  refreshToken: string; // raw value — caller sets it as an httpOnly cookie, never store raw
  refreshTokenExpiresAt: Date;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 256-bit
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Signup ----------

  async signup(dto: SignupDto): Promise<{ message: string }> {
    const existing = await this.users.findByEmail(dto.email);

    if (existing?.emailVerified) {
      // Don't say "email already in use" pre-verification — but a fully
      // registered, verified account is a genuine conflict worth surfacing.
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, name: dto.name ?? existing.name },
        })
      : await this.users.create({ email: dto.email, passwordHash, name: dto.name });

    await this.otp.issue(user.email, OtpPurpose.SIGNUP_VERIFY, user.id);
    await this.audit.log('SIGNUP', { userId: user.id });

    return { message: 'Account created. Check your email for a verification code.' };
  }

  async resendOtp(email: string, purpose: OtpPurpose): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);

    // Enumeration protection: identical response whether or not the account exists,
    // except SIGNUP_VERIFY implies the caller just signed up, so a missing user is a real error.
    if (!user) {
      if (purpose === OtpPurpose.SIGNUP_VERIFY) {
        throw new BadRequestException('No pending signup found for this email.');
      }
      return { message: 'If an account exists, a code has been sent.' };
    }

    await this.otp.issue(email, purpose, user.id);
    return { message: 'If an account exists, a code has been sent.' };
  }

  // ---------- OTP verification (signup + login 2FA) ----------

  async verifySignupOtp(email: string, code: string, meta: RequestMeta): Promise<TokenPair & { user: unknown }> {
    await this.otp.verify(email, OtpPurpose.SIGNUP_VERIFY, code);

    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Account not found.');
    }

    const verifiedUser = await this.users.markEmailVerified(user.id);
    const tokens = await this.issueTokenPair(verifiedUser.id, verifiedUser.email, meta);
    await this.audit.log('EMAIL_VERIFIED', { userId: verifiedUser.id, ip: meta.ip, userAgent: meta.userAgent });

    return { ...tokens, user: this.users.toPublic(verifiedUser) };
  }

  // ---------- Login ----------

  async login(dto: LoginDto, meta: RequestMeta): Promise<TokenPair & { user: unknown }> {
    const lockoutKey = `login:lockout:${dto.email}`;
    const failsKey = `login:fails:${dto.email}`;

    if (await this.redis.get(lockoutKey)) {
      await this.audit.log('LOGIN_LOCKED', { ip: meta.ip, userAgent: meta.userAgent, metadata: { email: dto.email } });
      throw new HttpException(
        'Too many failed sign-in attempts. Please try again in 15 minutes, or reset your password.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.users.findByEmail(dto.email);

    // Constant response for "no such user" vs "wrong password" to avoid enumeration.
    const invalidCredentials = async () => {
      const fails = await this.redis.incrWithExpiry(failsKey, LOGIN_LOCKOUT_SECONDS);
      if (fails >= MAX_LOGIN_FAILURES) {
        await this.redis.set(lockoutKey, '1', 'EX', LOGIN_LOCKOUT_SECONDS);
      }
      await this.audit.log('LOGIN_FAILED', {
        userId: user?.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { email: dto.email, attempt: fails },
      });
      return new UnauthorizedException('Invalid email or password.');
    };

    if (!user || !user.passwordHash) {
      throw await invalidCredentials();
    }

    const passwordOk = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw await invalidCredentials();
    }

    if (!user.emailVerified) {
      await this.otp.issue(user.email, OtpPurpose.SIGNUP_VERIFY, user.id);
      throw new BadRequestException('Email not verified. A new verification code has been sent.');
    }

    await this.redis.del(failsKey, lockoutKey);
    const tokens = await this.issueTokenPair(user.id, user.email, meta);
    await this.audit.log('LOGIN_SUCCESS', { userId: user.id, ip: meta.ip, userAgent: meta.userAgent });
    return { ...tokens, user: this.users.toPublic(user) };
  }

  // ---------- Token issuance / rotation ----------

  private async issueTokenPair(userId: string, email: string, meta: RequestMeta): Promise<TokenPair> {
    // Secret + expiresIn are already configured as defaults on JwtModule (see auth.module.ts),
    // so no need to re-pass them here.
    const accessToken = this.jwt.sign({ sub: userId, email });

    const refreshToken = generateOpaqueToken();
    const refreshTokenHash = hashToken(refreshToken);
    const ttlMs = parseDurationMs(this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d');
    const refreshTokenExpiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt };
  }

  /** Rotates the refresh token: old one is invalidated even if reused (replay/theft detection). */
  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      // If a revoked-but-presented token shows up, treat it as a possible theft signal:
      // revoke all sessions for that user as a precaution.
      if (session?.revoked) {
        await this.prisma.session.updateMany({ where: { userId: session.userId }, data: { revoked: true } });
        await this.audit.log('TOKEN_REUSE_DETECTED', {
          userId: session.userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          metadata: { sessionId: session.id },
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Invalidate the used token immediately.
    await this.prisma.session.update({ where: { id: session.id }, data: { revoked: true } });

    const user = await this.users.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    await this.audit.log('TOKEN_REFRESHED', { userId: user.id, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueTokenPair(user.id, user.email, meta);
  }

  async logout(rawRefreshToken: string, meta: RequestMeta = {}): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });
    await this.prisma.session.updateMany({ where: { refreshTokenHash: tokenHash }, data: { revoked: true } });
    if (session) {
      await this.audit.log('LOGOUT', { userId: session.userId, ip: meta.ip, userAgent: meta.userAgent });
    }
  }

  async logoutAll(userId: string, meta: RequestMeta = {}): Promise<void> {
    await this.prisma.session.updateMany({ where: { userId }, data: { revoked: true } });
    await this.audit.log('LOGOUT_ALL', { userId, ip: meta.ip, userAgent: meta.userAgent });
  }

  // ---------- Password reset ----------

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);
    if (user) {
      await this.otp.issue(email, OtpPurpose.PASSWORD_RESET, user.id);
      await this.audit.log('PASSWORD_RESET_REQUESTED', { userId: user.id });
    }
    // Identical response regardless of whether the account exists.
    return { message: 'If an account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.otp.verify(dto.email, OtpPurpose.PASSWORD_RESET, dto.code);

    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Account not found.');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.users.setPassword(user.id, passwordHash);

    // Revoke all existing sessions — a password change should log out every device.
    await this.logoutAll(user.id);
    // Also clear any login lockout, since a password reset is a legitimate
    // recovery path and shouldn't leave the account stuck locked out.
    await this.redis.del(`login:fails:${dto.email}`, `login:lockout:${dto.email}`);
    await this.audit.log('PASSWORD_RESET_COMPLETED', { userId: user.id });

    return { message: 'Password updated. Please sign in again.' };
  }

  // ---------- OAuth ----------

  /**
   * Finds an existing OAuth-linked user, links a new provider to an existing
   * email match, or creates a fresh account — then issues our own session
   * tokens. We never trust or pass through the provider's own tokens.
   */
  async handleOAuthLogin(
    profile: { provider: 'GOOGLE' | 'GITHUB'; providerAccountId: string; email: string; name?: string; avatarUrl?: string },
    meta: RequestMeta,
  ): Promise<TokenPair & { user: unknown }> {
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });

    let user = existingAccount?.user;

    if (!user) {
      const existingByEmail = await this.users.findByEmail(profile.email);

      if (existingByEmail) {
        // Same email, different sign-in method — link the new provider to the existing account.
        user = existingByEmail;
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            emailVerified: new Date(), // the provider already verified this email
          },
        });
      }

      await this.prisma.oAuthAccount.create({
        data: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
          userId: user.id,
        },
      });
    }

    if (!user.emailVerified) {
      user = await this.users.markEmailVerified(user.id);
    }

    const tokens = await this.issueTokenPair(user.id, user.email, meta);
    await this.audit.log('OAUTH_LOGIN', {
      userId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { provider: profile.provider },
    });
    return { ...tokens, user: this.users.toPublic(user) };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.users.toPublic(user);
  }
}
