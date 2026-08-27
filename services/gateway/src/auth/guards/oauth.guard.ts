import { ExecutionContext, Injectable, NotImplementedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAuthConfigService } from '../oauth-config.service';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly oauthConfig: OAuthConfigService) {
    super();
  }
  canActivate(context: ExecutionContext) {
    if (!this.oauthConfig.isConfigured('google')) {
      throw new NotImplementedException('Google sign-in is not configured yet.');
    }
    return super.canActivate(context);
  }
}

@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly oauthConfig: OAuthConfigService) {
    super();
  }
  canActivate(context: ExecutionContext) {
    if (!this.oauthConfig.isConfigured('github')) {
      throw new NotImplementedException('GitHub sign-in is not configured yet.');
    }
    return super.canActivate(context);
  }
}
