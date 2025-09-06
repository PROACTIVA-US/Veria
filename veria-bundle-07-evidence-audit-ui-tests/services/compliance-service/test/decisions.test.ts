import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server';

describe('compliance-service', () => {
  it('emits decision and evidence', async () => {
    const app = buildServer();
    // Point audit to nowhere to avoid network during unit tests
    process.env.AUDIT_WRITER_URL = 'http://127.0.0.1:59999/not-running';
    const res = await app.inject({ method: 'POST', url: '/decisions', payload: { jurisdiction: 'US' } });
    expect(res.statusCode).toBe(201);
    const { decision, evidence } = res.json();
    expect(decision.outcome).toBe('allow');
    expect(evidence.version).toBe('0.1');
    expect(evidence.hashes.inputsSha256).toBeTypeOf('string');
  });
});
