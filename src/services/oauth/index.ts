import type { OAuthTokens } from './types.js'

export class OAuthService {
  async startOAuthFlow(): Promise<OAuthTokens> {
    throw new Error('Claude.ai OAuth flow has been removed from Close Code.')
  }

  handleManualAuthCodeInput(): void {}

  cleanup(): void {}
}
