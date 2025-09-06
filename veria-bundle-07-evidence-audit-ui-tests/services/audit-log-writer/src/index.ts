import Fastify from 'fastify';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
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

// Return last N lines as raw text
app.get('/audit/log', async (req: any, reply: any) => {
  const dir = process.env.AUDIT_DIR || './.audit-data';
  const file = join(dir, 'audit.log');
  if (!existsSync(file)) return reply.send('');
  const text = readFileSync(file, 'utf8');
  const q = Number((req.query?.n ?? 200)); // last N lines
  const lines = text.trim().split('\n');
  const tail = lines.slice(-q).join('\n');
  reply.type('text/plain').send(tail + '\n');
});

// Return parsed JSON items (last N)
app.get('/audit/items', async (req: any, reply: any) => {
  const dir = process.env.AUDIT_DIR || './.audit-data';
  const file = join(dir, 'audit.log');
  if (!existsSync(file)) return reply.send({ items: [] });
  const text = readFileSync(file, 'utf8');
  const q = Number((req.query?.n ?? 100));
  const lines = text.trim().split('\n').slice(-q);
  const items = lines.map(l => { try { return JSON.parse(l); } catch { return { parseError: true, raw: l }; } });
  return reply.send({ items });
});

const port = Number(process.env.PORT || 3005);
const host = process.env.HOST || '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
