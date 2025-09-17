import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { policyEngine, PolicyRuleset } from './policyEngine.js';
import { PolicyErrorCode } from '../types/errors.js';

// Mock the metrics and cache modules for test isolation
vi.mock('../utils/metrics.js', () => ({
  metrics: {
    counter: vi.fn(),
    gauge: vi.fn(),
    histogram: vi.fn()
  }
}));

vi.mock('../utils/decisionCache.js', () => {
  const cacheInstances = new Map();

  return {
    DecisionCache: class MockDecisionCache {
      private id = Math.random();
      private cache = new Map();

      constructor() {
        // Create a new isolated instance per test
        cacheInstances.set(this.id, this);
      }

      get(params: any) {
        return this.cache.get(JSON.stringify(params)) || null;
      }

      set(params: any, decision: string, reason?: string, ttl?: number) {
        this.cache.set(JSON.stringify(params), {
          decision,
          reason,
          timestamp: Date.now(),
          ttl: ttl || 5000
        });
      }

      clear() {
        this.cache.clear();
      }

      size() {
        return this.cache.size;
      }
    }
  };
});

describe('policyEngine middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockPolicy: PolicyRuleset;

  beforeEach(() => {
    // Clear all module caches to ensure test isolation
    vi.clearAllMocks();

    req = {
      headers: {},
      method: 'GET',
      originalUrl: '/test',
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      on: vi.fn(),
    };
    next = vi.fn();

    // Create a fresh default policy for each test
    mockPolicy = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true } },
      quotas: { default: { rps: 5, burst: 10 } },
      redaction: { fields: [], rules: [] },
      denyList: []
    };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should allow request with valid jurisdiction', async () => {
    const loader = vi.fn().mockResolvedValue(mockPolicy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Veria-Provenance',
      expect.stringContaining('"decision":"ALLOW"')
    );
    expect(next).toHaveBeenCalled();
  });

  it('should deny request from blocked jurisdiction', async () => {
    const policy = {
      ...mockPolicy,
      jurisdictions: { US: { allow: true }, OFAC: { allow: false } },
    };

    const loader = vi.fn().mockResolvedValue(policy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'OFAC',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PolicyErrorCode.JURISDICTION_DENIED,
        message: 'Jurisdiction not allowed'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny request for frozen subject', async () => {
    const policy = {
      ...mockPolicy,
      denyList: ['user:frozen'],
    };

    const loader = vi.fn().mockResolvedValue(policy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:frozen',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PolicyErrorCode.SUBJECT_FROZEN,
        message: 'Subject is frozen'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny request for frozen organization', async () => {
    const policy = {
      ...mockPolicy,
      denyList: ['org:frozen-org'],
    };

    const loader = vi.fn().mockResolvedValue(policy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:frozen-org',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PolicyErrorCode.ORG_FROZEN,
        message: 'Organization is frozen'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate and sanitize headers', async () => {
    const loader = vi.fn().mockResolvedValue(mockPolicy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123<script>',  // Invalid characters
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PolicyErrorCode.INVALID_HEADERS,
        message: 'Invalid header format'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should apply rate limiting', async () => {
    const policy = {
      ...mockPolicy,
      quotas: { default: { rps: 1, burst: 1 } },
    };

    const loader = vi.fn().mockResolvedValue(policy);
    const middleware = await policyEngine(loader);

    const headers = {
      'x-veria-subject': 'user:ratelimit',
      'x-veria-org': 'org:test',
      'x-veria-jurisdiction': 'US',
    };

    // First request should pass
    req.headers = headers;
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Reset mocks for second request
    next = vi.fn();
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();

    // Second request should be rate limited
    req.headers = headers;
    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PolicyErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded'
      })
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '1');
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle policy loading errors gracefully', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Failed to load'));
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PolicyErrorCode.ENGINE_ERROR,
        message: 'Policy engine internal error'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should set redaction rules for response', async () => {
    const policy = {
      ...mockPolicy,
      redaction: {
        fields: ['ssn', 'accountNumber'],
        rules: [{ path: '$.bankAccount', action: 'mask' }]
      }
    };

    const loader = vi.fn().mockResolvedValue(policy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect((req as any)._redactionRules).toEqual(policy.redaction);
    expect(next).toHaveBeenCalled();
  });

  it('should use org-specific quotas when available', async () => {
    const policy = {
      ...mockPolicy,
      quotas: {
        default: { rps: 1, burst: 1 },
        'org:org:premium': { rps: 100, burst: 200 }
      }
    };

    const loader = vi.fn().mockResolvedValue(policy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:premium',
      'x-veria-jurisdiction': 'US',
    };

    // Should allow multiple requests with premium quota
    for (let i = 0; i < 5; i++) {
      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      next = vi.fn(); // Reset for next iteration
    }
  });
});