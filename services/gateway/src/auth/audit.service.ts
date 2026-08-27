import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditEvent =
  | 'SIGNUP'
  | 'EMAIL_VERIFIED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_LOCKED'
  | 'OAUTH_LOGIN'
  | 'TOKEN_REFRESHED'
  | 'TOKEN_REUSE_DETECTED'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED';

interface AuditContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget by design: a logging failure should never block or fail
   * the auth action it's describing. Errors are caught and logged locally.
   */
  async log(event: AuditEvent, context: AuditContext = {}): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          event,
          userId: context.userId,
          ip: context.ip,
          userAgent: context.userAgent,
          metadata: context.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log for event "${event}": ${(err as Error).message}`);
    }
  }
}
