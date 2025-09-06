import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', name: 'identity-service', ts: new Date().toISOString() }));

app.post('/auth/passkey/register', async (req, reply) => {
  return reply.send({ challenge: 'mock-challenge', rpId: 'localhost', user: { id: 'demo', name: 'demo' } });
});

const port = Number(process.env.PORT || 3002);
const host = process.env.HOST || '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
