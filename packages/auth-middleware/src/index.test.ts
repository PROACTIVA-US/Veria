import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  authenticate,
  authorize,
  rateLimit,
  authenticateApiKey,
  hashPassword,
  generateApiKey,
  UserRole,
  Permission
} from './index.js';

// Mock database and Redis
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
    incr: vi.fn(),
    expire: vi.fn(),
    zadd: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn()
  }))
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { createPostgresPool, createRedisClient } = await import('@veria/database');
    mockDb = createPostgresPool();
    mockRedis = createRedisClient();

    mockRequest = {
      headers: {},
      body: {},
      ip: '127.0.0.1'
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis()
    };
  });

  describe('authenticate', () => {
    it('should authenticate valid JWT token', async () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        role: UserRole.INVESTOR,
        permissions: [Permission.USER_READ, Permission.TRANSACTION_READ],
        sessionId: 'sess_123'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'veria-secret-key-change-in-production');
      mockRequest.headers = { authorization: `Bearer ${token}` };
      
      mockRedis.get
        .mockResolvedValueOnce(null) // Not blacklisted
        .mockResolvedValueOnce(JSON.stringify({ userId: 'user_123' })); // Session exists

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect((mockRequest as any).user).toEqual(expect.objectContaining({
        userId: 'user_123',
        email: 'test@example.com',
        role: UserRole.INVESTOR
      }));
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject requests without token', async () => {
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'NO_TOKEN' })
          ])
        })
      );
    });

    it('should reject blacklisted tokens', async () => {
      const token = jwt.sign(
        { userId: 'user_123' },
        process.env.JWT_SECRET || 'veria-secret-key-change-in-production'
      );
      
      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockRedis.get.mockResolvedValueOnce('1'); // Token is blacklisted

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'TOKEN_BLACKLISTED' })
          ])
        })
      );
    });

    it('should reject expired sessions', async () => {
      const token = jwt.sign(
        { userId: 'user_123', sessionId: 'sess_123' },
        process.env.JWT_SECRET || 'veria-secret-key-change-in-production'
      );
      
      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockRedis.get
        .mockResolvedValueOnce(null) // Not blacklisted
        .mockResolvedValueOnce(null); // Session doesn't exist

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'SESSION_EXPIRED' })
          ])
        })
      );
    });

    it('should reject invalid tokens', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid_token' };

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'INVALID_TOKEN' })
          ])
        })
      );
    });
  });

  describe('authorize', () => {
    it('should allow users with required permissions', async () => {
      (mockRequest as any).user = {
        userId: 'user_123',
        role: UserRole.OPERATOR,
        permissions: [Permission.POLICY_READ, Permission.POLICY_WRITE]
      };

      const authorizeFn = authorize(Permission.POLICY_READ);
      await authorizeFn(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject users without required permissions', async () => {
      (mockRequest as any).user = {
        userId: 'user_123',
        role: UserRole.VIEWER,
        permissions: [Permission.USER_READ]
      };

      const authorizeFn = authorize(Permission.POLICY_WRITE);
      await authorizeFn(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'INSUFFICIENT_PERMISSIONS' })
          ])
        })
      );
    });

    it('should require all specified permissions', async () => {
      (mockRequest as any).user = {
        userId: 'user_123',
        role: UserRole.OPERATOR,
        permissions: [Permission.POLICY_READ] // Missing POLICY_WRITE
      };

      const authorizeFn = authorize(Permission.POLICY_READ, Permission.POLICY_WRITE);
      await authorizeFn(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('should reject if user is not authenticated', async () => {
      const authorizeFn = authorize(Permission.POLICY_READ);
      await authorizeFn(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'NOT_AUTHENTICATED' })
          ])
        })
      );
    });
  });

  describe('rateLimit', () => {
    it('should allow requests within rate limit', async () => {
      mockRedis.incr.mockResolvedValueOnce(50);

      await rateLimit(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        { limit: 100 }
      );

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '50');
    });

    it('should reject requests exceeding rate limit', async () => {
      mockRedis.incr.mockResolvedValueOnce(101);

      await rateLimit(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        { limit: 100 }
      );

      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' })
          ])
        })
      );
    });

    it('should use custom key generator', async () => {
      const keyGenerator = vi.fn().mockReturnValue('custom_key');
      mockRedis.incr.mockResolvedValueOnce(1);

      await rateLimit(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        { keyGenerator }
      );

      expect(keyGenerator).toHaveBeenCalledWith(mockRequest);
      expect(mockRedis.incr).toHaveBeenCalledWith('custom_key');
    });

    it('should set expiry for new rate limit keys', async () => {
      mockRedis.incr.mockResolvedValueOnce(1);

      await rateLimit(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        { window: 30 }
      );

      expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 30);
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      const apiKey = 'veria_test_key';
      mockRequest.headers = { 'x-api-key': apiKey };

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          service_name: 'test-service',
          permissions: ['read', 'write']
        }],
        rowCount: 1
      });

      await authenticateApiKey(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect((mockRequest as any).service).toEqual({
        name: 'test-service',
        permissions: ['read', 'write']
      });
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject requests without API key', async () => {
      await authenticateApiKey(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'NO_API_KEY' })
          ])
        })
      );
    });

    it('should reject invalid API keys', async () => {
      mockRequest.headers = { 'x-api-key': 'invalid_key' };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await authenticateApiKey(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'INVALID_API_KEY' })
          ])
        })
      );
    });
  });

  describe('Helper functions', () => {
    describe('hashPassword', () => {
      it('should hash passwords', async () => {
        const password = 'testPassword123';
        const hash = await hashPassword(password);

        expect(hash).not.toBe(password);
        expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
        
        const isValid = await bcrypt.compare(password, hash);
        expect(isValid).toBe(true);
      });

      it('should generate different hashes for same password', async () => {
        const password = 'testPassword123';
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        expect(hash1).not.toBe(hash2);
      });
    });

    describe('generateApiKey', () => {
      it('should generate API keys with correct format', () => {
        const apiKey = generateApiKey();

        expect(apiKey).toMatch(/^veria_[a-z0-9]+_[a-z0-9]+$/);
      });

      it('should generate unique API keys', () => {
        const keys = new Set();
        for (let i = 0; i < 100; i++) {
          keys.add(generateApiKey());
        }

        expect(keys.size).toBe(100);
      });
    });
  });

  describe('Role permissions', () => {
    it('should grant admin all permissions', () => {
      const { rolePermissions } = require('./index.js');
      
      expect(rolePermissions[UserRole.ADMIN]).toEqual(
        expect.arrayContaining(Object.values(Permission))
      );
    });

    it('should grant operator appropriate permissions', () => {
      const { rolePermissions } = require('./index.js');
      
      expect(rolePermissions[UserRole.OPERATOR]).toContain(Permission.USER_READ);
      expect(rolePermissions[UserRole.OPERATOR]).toContain(Permission.POLICY_WRITE);
      expect(rolePermissions[UserRole.OPERATOR]).not.toContain(Permission.AUDIT_EXPORT);
    });

    it('should grant investor limited permissions', () => {
      const { rolePermissions } = require('./index.js');
      
      expect(rolePermissions[UserRole.INVESTOR]).toContain(Permission.USER_READ);
      expect(rolePermissions[UserRole.INVESTOR]).toContain(Permission.TRANSACTION_CREATE);
      expect(rolePermissions[UserRole.INVESTOR]).not.toContain(Permission.POLICY_WRITE);
      expect(rolePermissions[UserRole.INVESTOR]).not.toContain(Permission.COMPLIANCE_OVERRIDE);
    });

    it('should grant viewer read-only permissions', () => {
      const { rolePermissions } = require('./index.js');
      
      expect(rolePermissions[UserRole.VIEWER]).toContain(Permission.USER_READ);
      expect(rolePermissions[UserRole.VIEWER]).toContain(Permission.AUDIT_READ);
      expect(rolePermissions[UserRole.VIEWER]).not.toContain(Permission.USER_WRITE);
      expect(rolePermissions[UserRole.VIEWER]).not.toContain(Permission.TRANSACTION_CREATE);
    });
  });
});