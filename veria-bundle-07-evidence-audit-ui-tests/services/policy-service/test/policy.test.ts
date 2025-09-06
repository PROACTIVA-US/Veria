import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server';

describe('policy-service', () => {
  it('creates a policy', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/policies', payload: { name: 'Test', version: '0.1' } });
    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.name).toBe('Test');
  });

  it('simulates a policy', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/policies/simulate', payload: { jurisdiction: 'US' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().outcome).toBe('allow');
  });
});
