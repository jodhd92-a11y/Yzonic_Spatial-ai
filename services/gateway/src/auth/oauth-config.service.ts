import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type OAuthProviderId = 'google' | 'github';

@Injectable()
export class OAuthConfigService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(provider: OAuthProviderId): boolean {
    switch (provider) {
      case 'google':
        return !!(this.config.get('GOOGLE_CLIENT_ID') && this.config.get('GOOGLE_CLIENT_SECRET'));
      case 'github':
        return !!(this.config.get('GITHUB_CLIENT_ID') && this.config.get('GITHUB_CLIENT_SECRET'));
    }
  }
}
