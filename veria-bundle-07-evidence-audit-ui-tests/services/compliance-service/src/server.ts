import Fastify from 'fastify';
import crypto from 'crypto';
import fetch from 'node-fetch';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok', name: 'compliance-service', ts: new Date().toISOString() }));

  app.post('/decisions', async (req: any, reply: any) => {
    const input = (req.body ?? {}) as any;
    const outcome = input?.deny ? 'deny' : 'allow';
    const decision = {
      id: 'dec_' + Math.random().toString(36).slice(2,8),
      outcome,
      inputs: input,
      policyFingerprint: 'stub-0.1',
      createdAt: new Date().toISOString()
    };

    const inputsJson = JSON.stringify(input);
    const inputsSha256 = crypto.createHash('sha256').update(inputsJson).digest('hex');
    const evidence = {
      id: 'ev_' + Math.random().toString(36).slice(2,8),
      version: '0.1',
      decision,
      hashes: { inputsSha256 },
      signer: { name: 'compliance-service:stub', keyId: 'local-demo' }
    };

    // Forward to audit log writer
    const auditUrl = process.env.AUDIT_WRITER_URL || 'http://localhost:3005/audit';
    try {
      await fetch(auditUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'decision', decision, evidence })
      });
    } catch (e) {
      req.log.warn({ err: e }, 'Failed to write audit log');
    }

    return reply.code(201).send({ decision, evidence });
  });

  return app;
}
