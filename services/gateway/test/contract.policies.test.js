import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { buildServer } from '../src/server.js';

let downstream;
let gateway;

beforeAll(async () => {
  // downstream policy stub
  downstream = Fastify();
  downstream.get('/policies', async () => ({ items: [{ id: 'pol_x', name: 'Stub', version: '0.1', fingerprint: 'abc', body: {} }] }));
  await downstream.listen({ port: 31333 });

  // gateway pointing to stub
  gateway = buildServer({ POLICY_URL: 'http://localhost:31333', IDENTITY_URL: 'http://localhost:3002', COMPLIANCE_URL: 'http://localhost:3004', AUDIT_URL: 'http://localhost:3005' });
});

afterAll(async () => {
  await downstream.close();
  await gateway.close();
});

describe('gateway → policy proxy', () => {
  it('proxies GET /policies', async () => {
    const res = await gateway.inject({ method: 'GET', url: '/policies' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBeTruthy();
    const json = res.json();
    expect(json.items?.[0]?.id).toBe('pol_x');
  });
});
