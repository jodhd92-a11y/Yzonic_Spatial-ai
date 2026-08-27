import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    super(configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
  }

  async onModuleInit() {
    // ioredis connects lazily on first command by default; nothing required here.
  }

  async onModuleDestroy() {
    await this.quit();
  }

  /** Increment a counter with a TTL, used for rate limiting (e.g. OTP attempts per destination+IP). */
  async incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.incr(key);
    if (count === 1) {
      await this.expire(key, ttlSeconds);
    }
    return count;
  }
}
