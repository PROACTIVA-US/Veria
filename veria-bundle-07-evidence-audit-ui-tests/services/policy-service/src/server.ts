import Fastify from 'fastify';

export function buildServer() {
  const app = Fastify({ logger: true });

  type Policy = { id: string; name: string; version: string; body: any };
  const store: Record<string, Policy> = {};

  app.get('/health', async () => ({ status: 'ok', name: 'policy-service', ts: new Date().toISOString() }));

  app.get('/policies', async () => ({ items: Object.values(store) }));

  app.post('/policies', async (req, reply) => {
    const id = 'pol_' + Math.random().toString(36).slice(2, 8);
    const body = (req.body ?? {}) as any;
    const p: Policy = { id, name: body?.name ?? 'Unnamed Policy', version: body?.version ?? '0.1', body };
    store[id] = p;
    return reply.code(201).send(p);
  });

  app.post('/policies/simulate', async (req, reply) => {
    return reply.send({ outcome: 'allow', inputs: req.body ?? {}, policyVersion: '0.1' });
  });

  return app;
}
