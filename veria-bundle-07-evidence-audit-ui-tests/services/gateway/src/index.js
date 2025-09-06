import Fastify from 'fastify';
import helmet from 'fastify-helmet';
import cors from 'fastify-cors';
import fetch from 'node-fetch';

const server = Fastify({ logger: true });
await server.register(helmet);
await server.register(cors, { origin: true });

const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:3002';
const POLICY_URL   = process.env.POLICY_URL   || 'http://localhost:3003';
const COMPLIANCE_URL = process.env.COMPLIANCE_URL || 'http://localhost:3004';
const AUDIT_URL = process.env.AUDIT_URL || 'http://localhost:3005';

server.get('/health', async () => ({ status: 'ok', name: 'gateway', ts: new Date().toISOString() }));

async function proxy(req, reply, base, path, init = {}) {
  const idx = req.raw.url.indexOf('?');
  const qs = idx >= 0 ? req.raw.url.slice(idx) : '';
  const url = base + path + qs;
  const res = await fetch(url, {
    method: req.method,
    headers: { 'content-type': 'application/json' },
    body: ['POST','PUT','PATCH'].includes(req.method) ? JSON.stringify(req.body || {}) : undefined,
    ...init
  });
  const text = await res.text();
  reply.code(res.status).send(text);
}

// Identity
server.get('/identity/health', async (req, reply) => proxy(req, reply, IDENTITY_URL, '/health'));
server.post('/auth/passkey/register', async (req, reply) => proxy(req, reply, IDENTITY_URL, '/auth/passkey/register'));

// Policy
server.get('/policies', async (req, reply) => proxy(req, reply, POLICY_URL, '/policies'));
server.post('/policies', async (req, reply) => proxy(req, reply, POLICY_URL, '/policies'));
server.post('/policies/simulate', async (req, reply) => proxy(req, reply, POLICY_URL, '/policies/simulate'));

// Compliance
server.post('/decisions', async (req, reply) => proxy(req, reply, COMPLIANCE_URL, '/decisions'));

// Audit
server.get('/audit/health', async (req, reply) => proxy(req, reply, AUDIT_URL, '/health'));
server.get('/audit/items', async (req, reply) => proxy(req, reply, AUDIT_URL, '/audit/items'));

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

server.listen({ port, host }).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
