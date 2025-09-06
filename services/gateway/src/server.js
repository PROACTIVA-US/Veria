import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import fetch from 'node-fetch';
import { getConfig } from './config.js';
import { getOrCreateReqId } from './reqid.js';

export function buildServer(env = process.env) {
  const cfg = getConfig(env);
  const server = Fastify({ logger: true });

  server.register(helmet);
  server.register(cors, { origin: cfg.origins });

  // request-id hook
  server.addHook('onRequest', async (req, reply) => {
    const reqId = getOrCreateReqId(req.headers);
    reply.header('x-request-id', reqId);
    // @ts-ignore
    req.reqId = reqId;
  });

  async function proxy(req, reply, base, path) {
    const idx = req.raw.url.indexOf('?');
    const qs = idx >= 0 ? req.raw.url.slice(idx) : '';
    const url = base + path + qs;
    const reqId = /** @type {any} */(req).reqId;
    const res = await fetch(url, {
      method: req.method,
      headers: { 'content-type': 'application/json', 'x-request-id': reqId },
      body: ['POST','PUT','PATCH'].includes(req.method) ? JSON.stringify(req.body || {}) : undefined,
    });
    const text = await res.text();
    reply.code(res.status).send(text);
  }

  server.get('/health', async () => ({ status: 'ok', name: 'gateway', ts: new Date().toISOString() }));

  // Identity
  server.get('/identity/health', async (req, reply) => proxy(req, reply, cfg.IDENTITY_URL, '/health'));
  server.post('/auth/passkey/register', async (req, reply) => proxy(req, reply, cfg.IDENTITY_URL, '/auth/passkey/register'));

  // Policy
  server.get('/policies', async (req, reply) => proxy(req, reply, cfg.POLICY_URL, '/policies'));
  server.get('/policies/:id', async (req, reply) => proxy(req, reply, cfg.POLICY_URL, `/policies/${req.params.id}`));
  server.post('/policies', async (req, reply) => proxy(req, reply, cfg.POLICY_URL, '/policies'));
  server.post('/policies/validate', async (req, reply) => proxy(req, reply, cfg.POLICY_URL, '/policies/validate'));
  server.post('/policies/simulate', async (req, reply) => proxy(req, reply, cfg.POLICY_URL, '/policies/simulate'));

  // Compliance
  server.post('/decisions', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/decisions'));

  // Audit
  server.get('/audit/health', async (req, reply) => proxy(req, reply, cfg.AUDIT_URL, '/health'));
  server.get('/audit/items', async (req, reply) => proxy(req, reply, cfg.AUDIT_URL, '/audit/items'));

  return server;
}
