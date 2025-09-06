import Fastify from 'fastify';
import Ajv from 'ajv';
import { evaluate } from './evaluator';
import { fingerprintPolicy } from './fingerprint';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export function buildServer() {
  const app = Fastify({ logger: true });
  const prisma = new PrismaClient();

  // Load policy JSON schema for /validate (best-effort)
  const schemaPath = path.join(process.cwd(), 'docs', 'policy.schema.json');
  let validate: any = null;
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(schema);
  } catch (e) {
    app.log.warn('Policy schema not found or invalid; /policies/validate will be a no-op');
  }

  app.get('/health', async () => ({ status: 'ok', name: 'policy-service', ts: new Date().toISOString() }));

  app.get('/policies', async () => {
    const items = await prisma.policy.findMany({ orderBy: { createdAt: 'desc' } });
    return { items };
  });

  app.get('/policies/:id', async (req, reply) => {
    // @ts-ignore
    const id = req.params.id as string;
    const p = await prisma.policy.findUnique({ where: { id } });
    if (!p) return reply.code(404).send({ error: 'not_found' });
    return p;
  });

  app.post('/policies', async (req, reply) => {
    const body = (req.body ?? {}) as any;
    const name = body?.metadata?.name ?? body?.name ?? 'Unnamed Policy';
    const version = body?.version ?? '0.1';
    const fingerprint = fingerprintPolicy(body);
    const created = await prisma.policy.create({
      data: { name, version, fingerprint, body }
    });
    return reply.code(201).send(created);
  });

  app.post('/policies/validate', async (req, reply) => {
    if (!validate) return reply.send({ ok: true, warnings: ['schema not loaded'] });
    const body = (req.body ?? {}) as any;
    const ok = validate(body);
    return reply.send({ ok, errors: ok ? [] : validate.errors });
  });

  app.post('/policies/simulate', async (req, reply) => {
    const payload = (req.body ?? {}) as any;
    const input = payload?.input || payload; // accept both styles
    let policyBody: any | null = null;

    if (payload?.policyId) {
      const p = await prisma.policy.findUnique({ where: { id: payload.policyId } });
      policyBody = p?.body ?? null;
    } else if (payload?.policyFingerprint) {
      const p = await prisma.policy.findUnique({ where: { fingerprint: payload.policyFingerprint } });
      policyBody = p?.body ?? null;
    } else {
      const latest = await prisma.policy.findFirst({ orderBy: { createdAt: 'desc' } });
      policyBody = latest?.body ?? null;
    }

    if (!policyBody) {
      return reply.code(400).send({ error: 'no_policy', message: 'Create a policy first, or pass policyId/policyFingerprint' });
    }

    const result = evaluate(policyBody, input || {});
    return reply.send({ outcome: result.outcome, reasons: result.reasons });
  });

  return app;
}
