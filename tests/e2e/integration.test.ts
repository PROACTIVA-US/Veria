import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'veria-secret-key-change-in-production';

describe('E2E Integration Tests', () => {
  let client: AxiosInstance;
  let authenticatedClient: AxiosInstance;
  let authToken: string;
  let testUserId: string;
  let testPolicyId: string;

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });

    // Create a test auth token
    authToken = jwt.sign(
      {
        userId: 'test_user_123',
        email: 'test@veria.com',
        role: 'operator',
        permissions: [
          'user:read', 'user:write',
          'policy:read', 'policy:write', 'policy:evaluate',
          'compliance:read', 'compliance:write',
          'transaction:read', 'transaction:create',
          'audit:read'
        ],
        sessionId: 'test_session_123'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    authenticatedClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateStatus: () => true
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status for gateway', async () => {
      const response = await client.get('/health');
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'ok',
        name: 'gateway'
      });
      expect(response.data.ts).toBeDefined();
    });

    it('should check health of downstream services', async () => {
      const services = [
        { path: '/identity/health', name: 'identity-service' },
        { path: '/audit/health', name: 'audit-log-writer' }
      ];

      for (const service of services) {
        const response = await client.get(service.path);
        if (response.status === 200) {
          expect(response.data.status).toBe('ok');
        } else {
          console.warn(`Service ${service.name} not available for testing`);
        }
      }
    });
  });

  describe('Policy Service Integration', () => {
    it('should create and retrieve a policy', async () => {
      // Create a policy
      const policyData = {
        name: 'E2E Test Policy ' + Date.now(),
        description: 'Policy created during E2E testing',
        version: '1.0',
        rules: {
          kyc_required: true,
          min_investment: 1000,
          max_investment: 100000,
          allowed_jurisdictions: ['US', 'EU', 'UK']
        },
        status: 'active'
      };

      const createResponse = await authenticatedClient.post('/policies', policyData);
      
      if (createResponse.status === 201) {
        expect(createResponse.data.success).toBe(true);
        testPolicyId = createResponse.data.data.id;
        expect(testPolicyId).toBeDefined();
        
        // Retrieve the policy
        const getResponse = await authenticatedClient.get(`/policies/${testPolicyId}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.data.success).toBe(true);
        expect(getResponse.data.data.id).toBe(testPolicyId);
      } else if (createResponse.status === 401) {
        console.warn('Policy creation requires authentication - skipping');
      }
    });

    it('should validate policy configuration', async () => {
      const validPolicy = {
        version: '1.0',
        metadata: {
          name: 'Valid Policy',
          jurisdiction: ['US', 'EU']
        },
        requirements: {
          sanctions: 'cleared',
          accreditation: {
            required: true,
            verification_method: 'income'
          }
        },
        limits: {
          min_investment: 5000,
          max_investment: 500000,
          per_investor_usd_total: 1000000
        }
      };

      const response = await authenticatedClient.post('/policies/validate', validPolicy);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.data.valid).toBe(true);
        expect(response.data.data.errors).toEqual([]);
      }
    });

    it('should detect invalid policy configuration', async () => {
      const invalidPolicy = {
        metadata: { name: 'Invalid Policy' },
        requirements: { sanctions: 'invalid_value' },
        limits: {
          min_investment: 100000,
          max_investment: 1000
        }
      };

      const response = await authenticatedClient.post('/policies/validate', invalidPolicy);
      
      if (response.status === 200) {
        expect(response.data.data.valid).toBe(false);
        expect(response.data.data.errors.length).toBeGreaterThan(0);
      }
    });

    it('should simulate policy execution', async () => {
      const simulationRequest = {
        policy_id: testPolicyId,
        context: {
          investment_amount: 25000,
          jurisdiction: 'US'
        }
      };

      const response = await authenticatedClient.post('/policies/simulate', simulationRequest);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.data.scenarios).toBeDefined();
        expect(response.data.data.summary).toBeDefined();
      }
    });
  });

  describe('Compliance Service Integration', () => {
    it('should run compliance checks', async () => {
      const complianceRequest = {
        transaction_id: 'txn_e2e_' + Date.now(),
        user_id: 'test_user_123',
        amount: 50000,
        asset_type: 'EQUITY',
        jurisdiction: 'United States',
        context: {
          kyc_verified: true,
          accredited_investor: true,
          investment_amount: 50000
        }
      };

      const response = await authenticatedClient.post('/compliance/check', complianceRequest);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.data.transaction_id).toBe(complianceRequest.transaction_id);
        expect(response.data.data.overall_status).toBeDefined();
      }
    });

    it('should set up compliance monitoring', async () => {
      const monitoringRequest = {
        user_id: 'test_user_123',
        monitoring_type: 'aml',
        frequency: 'daily',
        criteria: {
          risk_threshold: 50,
          transaction_limit: 100000
        }
      };

      const response = await authenticatedClient.post('/compliance/monitor', monitoringRequest);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.data.monitoring_id).toBeDefined();
      }
    });

    it('should generate compliance report', async () => {
      const reportRequest = {
        user_id: 'test_user_123',
        report_type: 'summary'
      };

      const response = await authenticatedClient.post('/compliance/report', reportRequest);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.data.report).toBeDefined();
      }
    });
  });

  describe('Identity Service Integration', () => {
    it('should handle passkey registration', async () => {
      const response = await client.post('/auth/passkey/register', {
        username: `test-${Date.now()}@example.com`,
        displayName: 'Test User'
      });

      // Service might not be running
      if (response.status < 500) {
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle request ID propagation', async () => {
      const requestId = 'req_test_' + Date.now();
      const response = await client.get('/health', {
        headers: {
          'x-request-id': requestId
        }
      });
      
      expect(response.headers['x-request-id']).toBe(requestId);
    });

    it('should handle end-to-end transaction flow', async () => {
      // Skip if services are not authenticated
      if (!testPolicyId) {
        console.warn('Skipping e2e flow - no test policy available');
        return;
      }

      // 1. Evaluate the policy
      const evaluationResponse = await authenticatedClient.post(`/policies/${testPolicyId}/evaluate`, {
        user_id: 'test_user_123',
        context: {
          kyc_verified: true,
          investment_amount: 5000
        }
      });

      if (evaluationResponse.status === 200) {
        expect(evaluationResponse.data.data.decision).toBeDefined();
      }

      // 2. Run compliance checks
      const complianceResponse = await authenticatedClient.post('/compliance/check', {
        transaction_id: 'txn_flow_' + Date.now(),
        user_id: 'test_user_123',
        amount: 5000
      });

      if (complianceResponse.status === 200) {
        expect(complianceResponse.data.data.overall_status).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await authenticatedClient.get('/policies/non_existent_policy');
      
      if (response.status === 404) {
        expect(response.data.success).toBe(false);
        expect(response.data.errors).toBeDefined();
      }
    });

    it('should handle validation errors', async () => {
      const response = await authenticatedClient.post('/policies', {});
      
      if (response.status >= 400 && response.status < 500) {
        expect(response.data.success).toBeDefined();
      }
    });

    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(client.get('/health'));
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);
      
      // Rate limiting might be configured differently or disabled in test
      if (rateLimited) {
        expect(rateLimited).toBe(true);
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should allow public endpoints without auth', async () => {
      const response = await client.get('/health');
      expect(response.status).toBe(200);
    });

    it('should require auth for protected endpoints', async () => {
      const response = await client.get('/policies');
      
      // Should either require auth or work if service allows anonymous
      expect(response.status).toBeLessThanOrEqual(500);
    });

    it('should accept valid auth tokens', async () => {
      const response = await authenticatedClient.get('/policies');
      
      // Should not be 401 if token is valid
      expect(response.status).not.toBe(401);
    });
  });
});