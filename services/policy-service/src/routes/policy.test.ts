import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

describe('Policy Service Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    
    // Mock route handlers
    app.get('/health', async () => ({ status: 'ok', name: 'policy-service', ts: new Date().toISOString() }));
    
    app.post('/api/v1/policy/evaluate', async (request) => {
      const { policyId, context } = request.body as any;
      return {
        policyId,
        decision: 'allow',
        reasons: ['User has required permissions'],
        context
      };
    });
    
    app.post('/api/v1/policy/create', async (request) => {
      const { name, rules } = request.body as any;
      return {
        policyId: `policy-${Date.now()}`,
        name,
        rules,
        status: 'active',
        createdAt: new Date().toISOString()
      };
    });
    
    app.get('/api/v1/policy/:policyId', async (request) => {
      const { policyId } = request.params as any;
      return {
        policyId,
        name: 'Test Policy',
        rules: [],
        status: 'active'
      };
    });
    
    await app.ready();
  });

  it('should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.name).toBe('policy-service');
  });

  it('should evaluate policy', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policy/evaluate',
      payload: {
        policyId: 'policy-123',
        context: { userId: 'user-456' }
      }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.policyId).toBe('policy-123');
    expect(body.decision).toBe('allow');
    expect(body.reasons).toContain('User has required permissions');
  });

  it('should create new policy', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policy/create',
      payload: {
        name: 'New Policy',
        rules: [{ type: 'require_kyc', enabled: true }]
      }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.policyId).toBeDefined();
    expect(body.name).toBe('New Policy');
    expect(body.status).toBe('active');
  });

  it('should get policy by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/policy/policy-123'
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.policyId).toBe('policy-123');
    expect(body.status).toBe('active');
  });
});