import { describe, it, expect, beforeAll } from '@jest/globals';
import { PortfolioDTO, KycDTO, StatementDTO } from '@veria/types-investor';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'mock-jwt-token';

describe('Investor API Contract Tests', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
  };

  describe('Feature Flag Behavior', () => {
    it('should return 404 when feature flag is disabled', async () => {
      // This test assumes FEATURE_INVESTOR_PORTAL=false
      if (process.env.FEATURE_INVESTOR_PORTAL === 'true') {
        return; // Skip if flag is enabled
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/portfolio`, {
        headers,
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Feature not available');
    });
  });

  describe('Portfolio Endpoint', () => {
    it('should return valid portfolio data structure', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return; // Skip if flag is disabled
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/portfolio`, {
        headers,
      });

      expect(response.status).toBe(200);
      const portfolio: PortfolioDTO = await response.json();

      // Validate structure
      expect(portfolio).toHaveProperty('positions');
      expect(portfolio).toHaveProperty('cash');
      expect(portfolio).toHaveProperty('nav');
      expect(portfolio).toHaveProperty('asOf');

      // Validate positions array
      expect(Array.isArray(portfolio.positions)).toBe(true);
      if (portfolio.positions.length > 0) {
        const position = portfolio.positions[0];
        expect(position).toHaveProperty('symbol');
        expect(position).toHaveProperty('quantity');
        expect(position).toHaveProperty('price');
        expect(position).toHaveProperty('value');
      }

      // Validate cash object
      expect(portfolio.cash).toHaveProperty('currency');
      expect(portfolio.cash).toHaveProperty('amount');
      expect(typeof portfolio.cash.amount).toBe('number');

      // Validate NAV
      expect(typeof portfolio.nav).toBe('number');
      expect(portfolio.nav).toBeGreaterThan(0);

      // Validate date
      expect(new Date(portfolio.asOf).toString()).not.toBe('Invalid Date');
    });

    it('should require authentication', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/portfolio`);
      expect(response.status).toBe(401);
    });

    it('should require portfolio:read scope', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      // Use token without portfolio:read scope
      const limitedToken = 'token-without-portfolio-scope';
      const response = await fetch(`${API_BASE_URL}/api/investor/portfolio`, {
        headers: {
          'Authorization': `Bearer ${limitedToken}`,
        },
      });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('KYC Endpoint', () => {
    it('should return valid KYC status structure', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/kyc`, {
        headers,
      });

      expect(response.status).toBe(200);
      const kyc: KycDTO = await response.json();

      // Validate structure
      expect(kyc).toHaveProperty('status');
      expect(kyc).toHaveProperty('provider');
      expect(kyc).toHaveProperty('updatedAt');

      // Validate status enum
      expect(['pending', 'approved', 'failed']).toContain(kyc.status);

      // Validate provider
      expect(['mock', 'sumsub', 'onfido']).toContain(kyc.provider);

      // Validate date
      expect(new Date(kyc.updatedAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Statements Endpoint', () => {
    it('should return valid statements array', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/statements`, {
        headers,
      });

      expect(response.status).toBe(200);
      const statements: StatementDTO[] = await response.json();

      // Validate array
      expect(Array.isArray(statements)).toBe(true);

      if (statements.length > 0) {
        const statement = statements[0];
        expect(statement).toHaveProperty('id');
        expect(statement).toHaveProperty('period');
        expect(statement).toHaveProperty('url');

        // URL can be null or string
        expect([null, 'string']).toContain(typeof statement.url);
      }
    });
  });

  describe('Transfer Request Endpoint', () => {
    it('should accept transfer request when flag is enabled', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const transferRequest = {
        amount: {
          currency: 'USD',
          amount: 10000,
        },
        direction: 'deposit',
        accountId: 'acc_test_123',
        notes: 'Test transfer',
      };

      const response = await fetch(`${API_BASE_URL}/api/investor/transfers/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(transferRequest),
      });

      expect(response.status).toBe(202); // Accepted for async processing

      const result = await response.json();
      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('pending');
      expect(result).toHaveProperty('createdAt');
    });

    it('should reject transfer request when flag is disabled', async () => {
      // This would need a separate test environment with flag disabled
      if (process.env.FEATURE_INVESTOR_PORTAL === 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/transfers/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Response Headers', () => {
    it('should include security headers', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/portfolio`, {
        headers,
      });

      // Check for common security headers
      expect(response.headers.get('x-content-type-options')).toBeTruthy();
      expect(response.headers.get('x-frame-options')).toBeTruthy();
    });

    it('should include correlation ID', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/portfolio`, {
        headers: {
          ...headers,
          'x-correlation-id': 'test-correlation-123',
        },
      });

      // Correlation ID should be echoed back
      expect(response.headers.get('x-correlation-id')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return proper error structure for 404', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/nonexistent`, {
        headers,
      });

      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error).toHaveProperty('error');
    });

    it('should handle malformed requests', async () => {
      if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/investor/transfers/request`, {
        method: 'POST',
        headers,
        body: 'invalid-json',
      });

      expect(response.status).toBe(400);
    });
  });
});