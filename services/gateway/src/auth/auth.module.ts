import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleOAuthGuard, GithubOAuthGuard } from './guards/oauth.guard';
import { OAuthConfigService } from './oauth-config.service';
import { AuditService } from './audit.service';
import { UsersModule } from '../users/users.module';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    UsersModule,
    OtpModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        // `expiresIn` is typed by @nestjs/jwt as `number | StringValue` (from the `ms` package);
        // our env value ("15m", "30d", etc.) satisfies that shape at runtime, hence the cast.
        signOptions: { expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as unknown as number },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OAuthConfigService,
    AuditService,
    GoogleStrategy,
    GithubStrategy,
    GoogleOAuthGuard,
    GithubOAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
