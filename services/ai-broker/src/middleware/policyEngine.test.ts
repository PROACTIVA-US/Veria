import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { policyEngine, PolicyRuleset } from './policyEngine.js';

describe('policyEngine middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
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
  });

  it('should allow request with valid jurisdiction', async () => {
    const mockPolicy: PolicyRuleset = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true } },
      quotas: { default: { rps: 5, burst: 10 } },
    };

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
    const mockPolicy: PolicyRuleset = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true }, OFAC: { allow: false } },
    };

    const loader = vi.fn().mockResolvedValue(mockPolicy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'OFAC',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'jurisdiction' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny request for frozen subject', async () => {
    const mockPolicy: PolicyRuleset = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true } },
      denyList: ['user:frozen'],
    };

    const loader = vi.fn().mockResolvedValue(mockPolicy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:frozen',
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'frozen' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate and sanitize headers', async () => {
    const mockPolicy: PolicyRuleset = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true } },
    };

    const loader = vi.fn().mockResolvedValue(mockPolicy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:123<script>',  // Invalid characters
      'x-veria-org': 'org:acme',
      'x-veria-jurisdiction': 'US',
    };

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid_headers' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should apply rate limiting', async () => {
    const mockPolicy: PolicyRuleset = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true } },
      quotas: { default: { rps: 1, burst: 1 } },
    };

    const loader = vi.fn().mockResolvedValue(mockPolicy);
    const middleware = await policyEngine(loader);

    req.headers = {
      'x-veria-subject': 'user:ratelimit',
      'x-veria-org': 'org:test',
      'x-veria-jurisdiction': 'US',
    };

    // First request should pass
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Reset mocks for second request
    next = vi.fn();
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();

    // Second request should be rate limited
    await middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'rate_limit_exceeded' });
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
    expect(res.json).toHaveBeenCalledWith({ error: 'policy_engine_error' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should generate request ID if not provided', async () => {
    const mockPolicy: PolicyRuleset = {
      version: 'test-1.0',
      jurisdictions: { US: { allow: true } },
    };

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
      expect.stringMatching(/"reqId":"[a-f0-9-]{36}"/)
    );
  });
});