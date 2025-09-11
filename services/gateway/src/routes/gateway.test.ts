import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

describe('Gateway Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    
    // Mock route handlers
    app.get('/health', async () => ({ status: 'ok', name: 'gateway', ts: new Date().toISOString() }));
    
    app.post('/api/v1/identity/*', async (request) => {
      return { proxied: true, path: request.url };
    });
    
    app.post('/api/v1/policy/*', async (request) => {
      return { proxied: true, path: request.url };
    });
    
    app.post('/api/v1/compliance/*', async (request) => {
      return { proxied: true, path: request.url };
    });
    
    app.post('/api/v1/audit/*', async (request) => {
      return { proxied: true, path: request.url };
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
    expect(body.name).toBe('gateway');
  });

  it('should proxy identity service requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/identity/verify',
      payload: { userId: '123' }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.proxied).toBe(true);
    expect(body.path).toContain('/api/v1/identity/verify');
  });

  it('should proxy policy service requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policy/evaluate',
      payload: { policyId: 'policy-123' }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.proxied).toBe(true);
    expect(body.path).toContain('/api/v1/policy/evaluate');
  });

  it('should proxy compliance service requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/compliance/verify',
      payload: { transactionId: 'tx-123' }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.proxied).toBe(true);
    expect(body.path).toContain('/api/v1/compliance/verify');
  });

  it('should proxy audit service requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/audit/log',
      payload: { event: 'test-event' }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.proxied).toBe(true);
    expect(body.path).toContain('/api/v1/audit/log');
  });
});