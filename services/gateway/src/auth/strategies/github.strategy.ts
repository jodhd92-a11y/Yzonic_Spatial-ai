import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import type { OAuthProfile } from './oauth-profile.interface';

type GitHubDoneCallback = (err: Error | null, user?: OAuthProfile) => void;

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || 'not-configured',
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: GitHubDoneCallback) {
    // GitHub only includes `emails` on the profile if the user has at least
    // one public/verified email and the `user:email` scope was granted.
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    if (!email) {
      return done(new Error('GitHub account has no accessible email. Make an email public on GitHub and try again.'));
    }
    const oauthProfile: OAuthProfile = {
      provider: 'GITHUB',
      providerAccountId: profile.id,
      email,
      name: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, oauthProfile);
  }
}
