import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import fetch from 'node-fetch';
import { createRedisClient } from '@veria/database';
import { getConfig } from './config.js';
import { getOrCreateReqId } from './reqid.js';

export function buildServer(env = process.env) {
  const cfg = getConfig(env);
  const server = Fastify({ logger: true });
  const redis = createRedisClient();

  server.register(helmet);
  server.register(cors, { origin: cfg.origins });

  // request-id hook with rate limiting
  server.addHook('onRequest', async (req, reply) => {
    const reqId = getOrCreateReqId(req.headers);
    reply.header('x-request-id', reqId);
    // @ts-ignore
    req.reqId = reqId;
    
    // Basic rate limiting using Redis
    const ip = req.ip;
    const key = `rate:${ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60); // 60 seconds window
    }
    
    if (count > 100) { // 100 requests per minute
      return reply.status(429).send({ error: 'Too many requests' });
    }
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

  // Tool Masker - API abstraction layer
  server.get('/tools/health', async (req, reply) => proxy(req, reply, cfg.TOOL_MASKER_URL, '/health'));
  server.get('/tools/masks', async (req, reply) => proxy(req, reply, cfg.TOOL_MASKER_URL, '/masks'));
  server.get('/tools/masks/:maskId', async (req, reply) => proxy(req, reply, cfg.TOOL_MASKER_URL, `/masks/${req.params.maskId}`));
  server.post('/tools/masks/:maskId/execute', async (req, reply) => proxy(req, reply, cfg.TOOL_MASKER_URL, `/masks/${req.params.maskId}/execute`));
  server.post('/tools/masks/batch', async (req, reply) => proxy(req, reply, cfg.TOOL_MASKER_URL, '/masks/batch'));

  // Enhanced Compliance endpoints (integrated in sprint 3)
  server.get('/compliance/health', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/health'));
  server.get('/compliance/rules', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/compliance/rules'));
  server.post('/compliance/rules', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/compliance/rules'));
  server.post('/compliance/rules/evaluate', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/compliance/rules/evaluate'));
  server.post('/compliance/sanctions/screen', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/compliance/sanctions/screen'));
  server.post('/compliance/monitor/transaction', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/compliance/monitor/transaction'));
  server.post('/compliance/comprehensive-check', async (req, reply) => proxy(req, reply, cfg.COMPLIANCE_URL, '/compliance/comprehensive-check'));

  return server;
}
