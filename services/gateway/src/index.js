
import Fastify from 'fastify';
const server = Fastify({ logger: true });
server.get('/', async () => ({ status: 'ok' }));
server.get('/health', async () => ({ status: 'ok' }));
const port = process.env.PORT || 3001;
server.listen({ port, host: '0.0.0.0' });
