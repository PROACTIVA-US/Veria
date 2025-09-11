import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildServer } from './server.js';

// Mock fetch
global.fetch = vi.fn();

// Mock Redis client
vi.mock('@veria/database', () => ({
  createRedisClient: vi.fn(() => ({
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    disconnect: vi.fn()
  }))
}));

describe('Gateway Service', () => {
  let server;
  let mockEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      PORT: '3001',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
      IDENTITY_SERVICE_URL: 'http://localhost:3002',
      POLICY_SERVICE_URL: 'http://localhost:3003',
      COMPLIANCE_SERVICE_URL: 'http://localhost:3004',
      AUDIT_SERVICE_URL: 'http://localhost:3005'
    };
    
    server = buildServer(mockEnv);
  });

  afterEach(async () => {
    await server.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: 'ok',
        name: 'gateway'
      });
      expect(body.ts).toBeDefined();
    });
  });

  describe('Request ID handling', () => {
    it('should add request ID to response headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_/);
    });

    it('should use existing request ID if provided', async () => {
      const existingReqId = 'req_existing_123';
      
      const response = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': existingReqId
        }
      });

      expect(response.headers['x-request-id']).toBe(existingReqId);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      const { createRedisClient } = await import('@veria/database');
      const mockRedis = createRedisClient();
      
      // Simulate rate limit exceeded
      mockRedis.incr.mockResolvedValueOnce(101);

      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Too many requests');
    });

    it('should allow requests within rate limit', async () => {
      const { createRedisClient } = await import('@veria/database');
      const mockRedis = createRedisClient();
      
      // Within rate limit
      mockRedis.incr.mockResolvedValueOnce(50);

      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Proxy routing', () => {
    describe('Identity Service', () => {
      it('should proxy GET /identity/health', async () => {
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ status: 'ok', name: 'identity-service' })
        });

        const response = await server.inject({
          method: 'GET',
          url: '/identity/health'
        });

        expect(response.statusCode).toBe(200);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3002/health',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'x-request-id': expect.stringMatching(/^req_/)
            })
          })
        );
      });

      it('should proxy POST /auth/passkey/register', async () => {
        const payload = { username: 'test@example.com' };
        
        global.fetch.mockResolvedValueOnce({
          status: 201,
          text: async () => JSON.stringify({ success: true })
        });

        const response = await server.inject({
          method: 'POST',
          url: '/auth/passkey/register',
          payload
        });

        expect(response.statusCode).toBe(201);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3002/auth/passkey/register',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(payload)
          })
        );
      });
    });

    describe('Policy Service', () => {
      it('should proxy GET /policies', async () => {
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ items: [] })
        });

        const response = await server.inject({
          method: 'GET',
          url: '/policies'
        });

        expect(response.statusCode).toBe(200);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3003/policies',
          expect.any(Object)
        );
      });

      it('should proxy GET /policies/:id with params', async () => {
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ id: 'pol_123' })
        });

        const response = await server.inject({
          method: 'GET',
          url: '/policies/pol_123'
        });

        expect(response.statusCode).toBe(200);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3003/policies/pol_123',
          expect.any(Object)
        );
      });

      it('should proxy POST /policies with body', async () => {
        const payload = { name: 'New Policy', rules: {} };
        
        global.fetch.mockResolvedValueOnce({
          status: 201,
          text: async () => JSON.stringify({ id: 'pol_new' })
        });

        const response = await server.inject({
          method: 'POST',
          url: '/policies',
          payload
        });

        expect(response.statusCode).toBe(201);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3003/policies',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(payload)
          })
        );
      });

      it('should proxy POST /policies/validate', async () => {
        const payload = { version: '1.0', metadata: {} };
        
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ valid: true })
        });

        const response = await server.inject({
          method: 'POST',
          url: '/policies/validate',
          payload
        });

        expect(response.statusCode).toBe(200);
      });

      it('should proxy POST /policies/simulate', async () => {
        const payload = { policy_id: 'pol_123', context: {} };
        
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ outcome: 'allow' })
        });

        const response = await server.inject({
          method: 'POST',
          url: '/policies/simulate',
          payload
        });

        expect(response.statusCode).toBe(200);
      });
    });

    describe('Compliance Service', () => {
      it('should proxy POST /decisions', async () => {
        const payload = { user_id: 'user_123', transaction_id: 'txn_123' };
        
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ decision: 'approved' })
        });

        const response = await server.inject({
          method: 'POST',
          url: '/decisions',
          payload
        });

        expect(response.statusCode).toBe(200);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3004/decisions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(payload)
          })
        );
      });
    });

    describe('Audit Service', () => {
      it('should proxy GET /audit/health', async () => {
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ status: 'ok', name: 'audit-service' })
        });

        const response = await server.inject({
          method: 'GET',
          url: '/audit/health'
        });

        expect(response.statusCode).toBe(200);
      });

      it('should proxy GET /audit/items with query params', async () => {
        global.fetch.mockResolvedValueOnce({
          status: 200,
          text: async () => JSON.stringify({ items: [] })
        });

        const response = await server.inject({
          method: 'GET',
          url: '/audit/items?limit=10&offset=0'
        });

        expect(response.statusCode).toBe(200);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3005/audit/items?limit=10&offset=0',
          expect.any(Object)
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should handle upstream service errors', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 500,
        text: async () => JSON.stringify({ error: 'Internal Server Error' })
      });

      const response = await server.inject({
        method: 'GET',
        url: '/policies'
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await server.inject({
        method: 'GET',
        url: '/policies'
      });

      // Fastify will handle the error and return 500
      expect(response.statusCode).toBe(500);
    });
  });

  describe('CORS configuration', () => {
    it('should allow configured origins', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });
});