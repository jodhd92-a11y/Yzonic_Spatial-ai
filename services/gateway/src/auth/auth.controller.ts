import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshGuard } from './guards/refresh.guard';
import { GoogleOAuthGuard, GithubOAuthGuard } from './guards/oauth.guard';
import type { OAuthProfile } from './strategies/oauth-profile.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { setAuthCookies, clearAuthCookies } from '../common/cookies';

function requestMeta(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (dto.purpose !== 'SIGNUP_VERIFY') {
      // LOGIN_2FA/PASSWORD_RESET are not enabled as a signup path in this phase;
      // PASSWORD_RESET is verified inline inside /auth/reset-password instead.
      throw new UnauthorizedException('Unsupported verification purpose for this endpoint.');
    }

    const { accessToken, refreshToken, refreshTokenExpiresAt, user } = await this.authService.verifySignupOtp(
      dto.email,
      dto.code,
      requestMeta(req),
    );

    setAuthCookies(res, this.config, { accessToken, refreshToken, refreshTokenExpiresAt });
    return { user };
  }

  @Post('resend-otp')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email, dto.purpose);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, refreshTokenExpiresAt, user } = await this.authService.login(
      dto,
      requestMeta(req),
    );
    setAuthCookies(res, this.config, { accessToken, refreshToken, refreshTokenExpiresAt });
    return { user };
  }

  @Post('refresh')
  @UseGuards(RefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies['refresh_token'] as string;
    const tokens = await this.authService.refresh(rawRefreshToken, requestMeta(req));
    setAuthCookies(res, this.config, tokens);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken, requestMeta(req));
    }
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: { userId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.userId, requestMeta(req));
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { userId: string }) {
    return this.authService.me(user.userId);
  }

  // ---------- OAuth ----------
  // Start routes just kick off the passport redirect; the guard does the work.
  // Callback routes finish the handshake, issue our own cookies, then bounce
  // the browser back to the frontend — this is a browser flow, not a JSON API.

  @Get('oauth/google')
  @UseGuards(GoogleOAuthGuard)
  googleStart() {
    // Handled by GoogleOAuthGuard — redirects to Google's consent screen.
  }

  @Get('oauth/google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.finishOAuth(req, res);
  }

  @Get('oauth/github')
  @UseGuards(GithubOAuthGuard)
  githubStart() {
    // Handled by GithubOAuthGuard.
  }

  @Get('oauth/github/callback')
  @UseGuards(GithubOAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.finishOAuth(req, res);
  }

  private async finishOAuth(req: Request, res: Response) {
    const profile = req.user as OAuthProfile;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    try {
      const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.authService.handleOAuthLogin(
        profile,
        requestMeta(req),
      );
      setAuthCookies(res, this.config, { accessToken, refreshToken, refreshTokenExpiresAt });
      return res.redirect(`${frontendUrl}/`);
    } catch {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
}
