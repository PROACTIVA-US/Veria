import crypto from 'crypto';

export class QuickBooksAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokenStore: Map<string, any> = new Map();

  constructor() {
    this.clientId = process.env.QB_CLIENT_ID || 'mock_client_id';
    this.clientSecret = process.env.QB_CLIENT_SECRET || 'mock_client_secret';
    this.redirectUri = process.env.QB_REDIRECT_URI || 'http://localhost:3001/connectors/quickbooks/auth/callback';
  }

  getAuthorizationUrl(): string {
    const state = crypto.randomBytes(16).toString('hex');
    const scope = 'com.intuit.quickbooks.accounting';

    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);

    return authUrl.toString();
  }

  async handleCallback(code: string, realmId: string): Promise<any> {
    const mockTokens = {
      access_token: `mock_access_token_${crypto.randomBytes(8).toString('hex')}`,
      refresh_token: `mock_refresh_token_${crypto.randomBytes(8).toString('hex')}`,
      expires_in: 3600,
      token_type: 'Bearer',
      realmId
    };

    this.tokenStore.set(realmId, mockTokens);
    return mockTokens;
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    return {
      access_token: `mock_access_token_${crypto.randomBytes(8).toString('hex')}`,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }

  getStoredTokens(realmId: string): any {
    return this.tokenStore.get(realmId);
  }
}