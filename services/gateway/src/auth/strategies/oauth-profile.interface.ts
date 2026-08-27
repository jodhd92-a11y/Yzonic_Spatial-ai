export interface OAuthProfile {
  provider: 'GOOGLE' | 'GITHUB';
  providerAccountId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}
