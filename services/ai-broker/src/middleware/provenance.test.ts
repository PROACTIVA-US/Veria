import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { provenanceLogger } from './provenance.js';

describe('provenanceLogger middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let consoleSpy: any;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
      originalUrl: '/test',
    };
    res = {
      statusCode: 200,
      on: vi.fn(),
    };
    next = vi.fn();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call next immediately', () => {
    const middleware = provenanceLogger();
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should register finish event listener', () => {
    const middleware = provenanceLogger();
    middleware(req as Request, res as Response, next);
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log request details on finish', () => {
    const middleware = provenanceLogger();

    (req as any)._provenance = {
      reqId: 'test-req-123',
      subject: 'user:test',
      org: 'org:acme',
    };

    middleware(req as Request, res as Response, next);

    // Trigger the finish event
    const finishCallback = (res.on as any).mock.calls[0][1];
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"kind":"gateway.request"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"reqId":"test-req-123"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"subject":"user:test"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"org":"org:acme"')
    );
  });

  it('should use x-request-id header if provenance not set', () => {
    const middleware = provenanceLogger();

    req.headers = {
      'x-request-id': 'header-req-456',
    };

    middleware(req as Request, res as Response, next);

    const finishCallback = (res.on as any).mock.calls[0][1];
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"reqId":"header-req-456"')
    );
  });

  it('should include latency measurement', (done) => {
    const middleware = provenanceLogger();

    middleware(req as Request, res as Response, next);

    const finishCallback = (res.on as any).mock.calls[0][1];

    // Wait a bit to ensure latency > 0
    setTimeout(() => {
      finishCallback();

      const logCall = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logCall);

      expect(parsed.latency_ms).toBeGreaterThanOrEqual(0);
      expect(parsed.latency_ms).toBeLessThan(100);
      done();
    }, 10);
  });

  it('should handle logging errors silently', () => {
    const middleware = provenanceLogger();

    // Create a circular reference that will cause JSON.stringify to throw
    const circular: any = { ref: null };
    circular.ref = circular;
    (req as any)._provenance = circular;

    middleware(req as Request, res as Response, next);

    const finishCallback = (res.on as any).mock.calls[0][1];

    // Should not throw
    expect(() => finishCallback()).not.toThrow();
  });

  it('should include request method and URL', () => {
    const middleware = provenanceLogger();

    req.method = 'POST';
    req.originalUrl = '/api/test/endpoint';

    middleware(req as Request, res as Response, next);

    const finishCallback = (res.on as any).mock.calls[0][1];
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"method":"POST"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"url":"/api/test/endpoint"')
    );
  });

  it('should include response status code', () => {
    const middleware = provenanceLogger();

    res.statusCode = 404;

    middleware(req as Request, res as Response, next);

    const finishCallback = (res.on as any).mock.calls[0][1];
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status":404')
    );
  });
});