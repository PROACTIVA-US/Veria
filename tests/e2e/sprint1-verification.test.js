import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

const SERVICES = {
  gateway: 'http://localhost:3001',
  identity: 'http://localhost:3002',
  policy: 'http://localhost:3003',
  compliance: 'http://localhost:3004',
  audit: 'http://localhost:3005'
};

describe('Sprint 1 - Service Verification', () => {
  
  describe('Health Checks', () => {
    Object.entries(SERVICES).forEach(([name, url]) => {
      it(`${name} service should be healthy`, async () => {
        const response = await fetch(`${url}/health`);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('ok');
      });
    });
  });

  describe('Gateway Service', () => {
    it('should proxy to identity service', async () => {
      const response = await fetch(`${SERVICES.gateway}/api/v1/identity/health`);
      expect(response.status).toBe(200);
    });

    it('should proxy to policy service', async () => {
      const response = await fetch(`${SERVICES.gateway}/api/v1/policy/health`);
      expect(response.status).toBe(200);
    });

    it('should proxy to compliance service', async () => {
      const response = await fetch(`${SERVICES.gateway}/api/v1/compliance/health`);
      expect(response.status).toBe(200);
    });
  });

  describe('Policy Service', () => {
    let policyId;

    it('should create a new policy', async () => {
      const response = await fetch(`${SERVICES.policy}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Policy',
          description: 'Sprint 1 test policy',
          rules: {
            kyc_required: true,
            min_investment: 1000
          }
        })
      });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      policyId = data.data.id;
    });

    it('should get policy by ID', async () => {
      const response = await fetch(`${SERVICES.policy}/policies/${policyId}`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Policy');
    });

    it('should validate policy', async () => {
      const response = await fetch(`${SERVICES.policy}/policies/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1.0',
          metadata: { name: 'Test' },
          requirements: { kyc: 'verified' }
        })
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Compliance Service', () => {
    it('should run compliance checks', async () => {
      const response = await fetch(`${SERVICES.compliance}/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: 'test-txn-001',
          user_id: 'test-user-001',
          amount: 5000,
          jurisdiction: 'United States'
        })
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.overall_status).toBeDefined();
    });

    it('should set up compliance monitoring', async () => {
      const response = await fetch(`${SERVICES.compliance}/compliance/monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user-001',
          monitoring_type: 'transactions',
          frequency: 'daily'
        })
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should generate compliance report', async () => {
      const response = await fetch(`${SERVICES.compliance}/compliance/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user-001',
          report_type: 'summary'
        })
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.report).toBeDefined();
    });
  });

  describe('Audit Service', () => {
    it('should write audit log', async () => {
      const response = await fetch(`${SERVICES.audit}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'test_event',
          serviceName: 'test_suite',
          action: 'sprint1_test',
          details: { test: true }
        })
      });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.ok).toBe(true);
    });

    it('should read audit logs', async () => {
      const response = await fetch(`${SERVICES.audit}/audit/items?limit=10`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.items)).toBe(true);
    });
  });

  describe('Database Integration', () => {
    it('Policy Service should connect to database', async () => {
      const response = await fetch(`${SERVICES.policy}/health`);
      const data = await response.json();
      expect(data.database).toBe('connected');
      expect(data.redis).toBe('connected');
    });

    it('Compliance Service should connect to database', async () => {
      const response = await fetch(`${SERVICES.compliance}/health`);
      const data = await response.json();
      expect(data.database).toBe('connected');
      expect(data.redis).toBe('connected');
    });
  });
});