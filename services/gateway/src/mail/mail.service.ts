import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface OtpEmailParams {
  to: string;
  code: string;
  purpose: 'SIGNUP_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET';
  expiresInMinutes: number;
}

const SUBJECT_BY_PURPOSE: Record<OtpEmailParams['purpose'], string> = {
  SIGNUP_VERIFY: 'Verify your email',
  LOGIN_2FA: 'Your login code',
  PASSWORD_RESET: 'Reset your password',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: string;
  private readonly from: string;
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('MAIL_PROVIDER') ?? 'console';
    this.from = this.configService.get<string>('MAIL_FROM') ?? 'no-reply@example.com';

    if (this.provider === 'resend') {
      const apiKey = this.configService.get<string>('MAIL_API_KEY');
      if (apiKey) {
        this.resend = new Resend(apiKey);
      } else {
        this.logger.warn('MAIL_PROVIDER=resend but MAIL_API_KEY is empty — falling back to console output');
      }
    }
  }

  async sendOtpEmail({ to, code, purpose, expiresInMinutes }: OtpEmailParams): Promise<void> {
    const subject = SUBJECT_BY_PURPOSE[purpose];
    const html = this.renderOtpTemplate(code, purpose, expiresInMinutes);

    if (this.provider === 'resend' && this.resend) {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      return;
    }

    // Dev fallback: log the "email" to the console so the flow can be tested without a mail provider.
    this.logger.log(
      `[console-mail] To: ${to} | Subject: ${subject} | Code: ${code} (expires in ${expiresInMinutes}m)`,
    );
  }

  private renderOtpTemplate(code: string, purpose: OtpEmailParams['purpose'], expiresInMinutes: number): string {
    const intro =
      purpose === 'SIGNUP_VERIFY'
        ? 'Use this code to verify your email address.'
        : purpose === 'LOGIN_2FA'
          ? 'Use this code to finish signing in.'
          : 'Use this code to reset your password.';

    return `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">${code}</p>
        <p style="color: #666; font-size: 14px;">This code expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
  }
}
