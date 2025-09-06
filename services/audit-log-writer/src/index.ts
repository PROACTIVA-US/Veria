import Fastify from 'fastify';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', name: 'audit-log-writer', ts: new Date().toISOString() }));

app.post('/audit', async (req: any, reply: any) => {
  const payload = req.body ?? {};
  const dir = process.env.AUDIT_DIR || './.audit-data';
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, 'audit.log');
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload }) + '\n';
  writeFileSync(file, line, { flag: 'a' });
  return reply.code(201).send({ ok: true });
});

const port = Number(process.env.PORT || 3005);
const host = process.env.HOST || '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
