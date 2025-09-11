import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Mock the database module
vi.mock('@veria/database', () => ({
  createPostgresPool: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn()
  })),
  createRedisClient: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn()
  })),
  dbQueries: {
    createPolicy: 'INSERT INTO policies...',
    getPolicyById: 'SELECT * FROM policies WHERE id = $1',
    evaluatePolicy: 'INSERT INTO policy_evaluations...'
  }
}));

describe('Policy Service', () => {
  let app: any;
  let mockDb: any;
  let mockRedis: any;

  beforeAll(async () => {
    // Import after mocks are set up
    const module = await import('./index.js');
    app = module.app || Fastify();
    
    // Get mock instances
    const { createPostgresPool, createRedisClient } = await import('@veria/database');
    mockDb = createPostgresPool();
    mockRedis = createRedisClient();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: 'ok',
        name: 'policy-service'
      });
      expect(body.ts).toBeDefined();
    });
  });

  describe('GET /policies', () => {
    it('should return list of policies', async () => {
      const mockPolicies = [
        {
          id: 'pol_123',
          name: 'Test Policy',
          status: 'active',
          rules: { kyc_required: true }
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockPolicies,
        rowCount: 1
      });

      const response = await app.inject({
        method: 'GET',
        url: '/policies'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockPolicies);
      expect(body.meta.total).toBe(1);
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await app.inject({
        method: 'GET',
        url: '/policies'
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors[0].code).toBe('DATABASE_ERROR');
    });
  });

  describe('GET /policies/:id', () => {
    it('should return policy from cache if available', async () => {
      const cachedPolicy = {
        id: 'pol_123',
        name: 'Cached Policy',
        status: 'active'
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedPolicy));

      const response = await app.inject({
        method: 'GET',
        url: '/policies/pol_123'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(cachedPolicy);
      expect(body.meta.cached).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const dbPolicy = {
        id: 'pol_123',
        name: 'DB Policy',
        status: 'active',
        rules: {}
      };

      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.query.mockResolvedValueOnce({
        rows: [dbPolicy],
        rowCount: 1
      });

      const response = await app.inject({
        method: 'GET',
        url: '/policies/pol_123'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(dbPolicy);
      expect(body.meta.cached).toBe(false);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return 404 for non-existent policy', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await app.inject({
        method: 'GET',
        url: '/policies/pol_nonexistent'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors[0].code).toBe('POLICY_NOT_FOUND');
    });
  });

  describe('POST /policies', () => {
    it('should create a new policy', async () => {
      const newPolicy = {
        name: 'New Policy',
        description: 'Test policy',
        rules: { kyc_required: true },
        status: 'draft'
      };

      const createdPolicy = {
        id: 'pol_new',
        ...newPolicy,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [createdPolicy],
        rowCount: 1
      });

      const response = await app.inject({
        method: 'POST',
        url: '/policies',
        payload: newPolicy
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdPolicy);
      expect(mockRedis.del).toHaveBeenCalledWith('policies:*');
    });
  });

  describe('POST /policies/:id/evaluate', () => {
    it('should evaluate policy successfully', async () => {
      const policy = {
        id: 'pol_123',
        name: 'Test Policy',
        rules: {
          kyc_required: true,
          min_investment: 1000
        }
      };

      const evaluationRequest = {
        user_id: 'user_123',
        context: {
          kyc_verified: true,
          investment_amount: 5000
        }
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [policy], rowCount: 1 }) // Get policy
        .mockResolvedValueOnce({ 
          rows: [{ id: 'eval_123' }], 
          rowCount: 1 
        }); // Store evaluation

      const response = await app.inject({
        method: 'POST',
        url: '/policies/pol_123/evaluate',
        payload: evaluationRequest
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.decision).toBe('allow');
      expect(body.data.evaluation_id).toBe('eval_123');
    });

    it('should deny when requirements not met', async () => {
      const policy = {
        id: 'pol_123',
        name: 'Test Policy',
        rules: {
          kyc_required: true,
          min_investment: 1000
        }
      };

      const evaluationRequest = {
        user_id: 'user_123',
        context: {
          kyc_verified: false,
          investment_amount: 500
        }
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [policy], rowCount: 1 })
        .mockResolvedValueOnce({ 
          rows: [{ id: 'eval_124' }], 
          rowCount: 1 
        });

      const response = await app.inject({
        method: 'POST',
        url: '/policies/pol_123/evaluate',
        payload: evaluationRequest
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.decision).toBe('deny');
      expect(body.data.reasons).toContain('KYC verification required');
      expect(body.data.reasons).toContain('Investment amount below minimum of 1000');
    });
  });

  describe('POST /policies/validate', () => {
    it('should validate valid policy', async () => {
      const validPolicy = {
        version: '1.0',
        metadata: {
          name: 'Valid Policy',
          jurisdiction: ['US', 'EU']
        },
        requirements: {
          sanctions: 'cleared'
        },
        limits: {
          min_investment: 1000,
          max_investment: 100000
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/policies/validate',
        payload: validPolicy
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.errors).toEqual([]);
    });

    it('should return validation errors for invalid policy', async () => {
      const invalidPolicy = {
        metadata: {
          name: 'Invalid Policy'
        },
        requirements: {
          sanctions: 'invalid_value'
        },
        limits: {
          min_investment: 100000,
          max_investment: 1000
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/policies/validate',
        payload: invalidPolicy
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.valid).toBe(false);
      expect(body.data.errors).toContain('Policy version is required');
      expect(body.data.errors).toContain('Invalid sanctions requirement value');
      expect(body.data.errors).toContain('min_investment cannot be greater than max_investment');
    });
  });

  describe('POST /policies/simulate', () => {
    it('should simulate policy execution', async () => {
      const policy = {
        id: 'pol_123',
        name: 'Test Policy',
        version: '1.0',
        rules: {
          kyc_required: true,
          accreditation_required: true
        }
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [policy],
        rowCount: 1
      });

      const response = await app.inject({
        method: 'POST',
        url: '/policies/simulate',
        payload: {
          policy_id: 'pol_123',
          context: {
            investment_amount: 5000
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.scenarios).toHaveLength(4);
      expect(body.data.summary.total_scenarios).toBe(4);
    });
  });
});