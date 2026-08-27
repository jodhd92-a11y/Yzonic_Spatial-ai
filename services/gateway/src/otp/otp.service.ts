import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

// Rate limits: per destination, and per destination+IP, over a rolling window.
const RESEND_WINDOW_SECONDS = 60; // one send per destination per minute
const SEND_WINDOW_SECONDS = 60 * 60; // max sends per destination per hour
const MAX_SENDS_PER_HOUR = 5;

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  // Cryptographically-random 6-digit code, zero-padded.
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return n.toString().padStart(OTP_LENGTH, '0');
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  /**
   * Generates a fresh OTP, stores its hash, and sends it via email.
   * Enforces per-destination cooldown + hourly cap via Redis.
   */
  async issue(destination: string, purpose: OtpPurpose, userId?: string): Promise<void> {
    const cooldownKey = `otp:cooldown:${purpose}:${destination}`;
    const hourlyKey = `otp:hourly:${purpose}:${destination}`;

    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      throw new HttpException('Please wait before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const hourlyCount = await this.redis.incrWithExpiry(hourlyKey, SEND_WINDOW_SECONDS);
    if (hourlyCount > MAX_SENDS_PER_HOUR) {
      throw new HttpException('Too many codes requested. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Invalidate any prior unconsumed codes for this destination+purpose.
    await this.prisma.otpCode.updateMany({
      where: { destination, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = generateCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { destination, purpose, codeHash, expiresAt, userId },
    });

    await this.redis.set(cooldownKey, '1', 'EX', RESEND_WINDOW_SECONDS);

    await this.mail.sendOtpEmail({
      to: destination,
      code,
      purpose,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  }

  /**
   * Verifies a submitted code against the most recent unconsumed OTP for a destination+purpose.
   * Uses exponential-style lockout via attempts counter; throws on mismatch or expiry.
   */
  async verify(destination: string, purpose: OtpPurpose, submittedCode: string): Promise<{ userId: string | null }> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { destination, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('No active code found. Please request a new one.');
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('This code has expired. Please request a new one.');
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    const submittedHash = hashCode(submittedCode);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(otp.codeHash, 'hex'),
    );

    if (!isMatch) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code.');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    return { userId: otp.userId };
  }
}
