import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createPostgresPool, dbQueries } from '@veria/database';
import { z } from 'zod';
import { setupJWT } from './auth/jwt.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { organizationRoutes } from './routes/organizations.js';
import { kycRoutes } from './routes/kyc.js';
import { passkeyRoutes } from './routes/passkeys.js';

const app = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'UTC',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Database setup
const db = createPostgresPool();
(app as any).db = db; // Attach to app for route access

// CORS setup
app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
});

// JWT setup
await setupJWT(app);

// Authentication middleware
app.decorate('authenticate', async function(request: any, reply: any) {
  try {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'No authorization header' });
    }
    
    const token = authorization.replace('Bearer ', '');
    const decoded = await app.jwt.verify(token);
    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ error: 'Invalid token' });
  }
});

// Request ID middleware
app.addHook('onRequest', async (request, reply) => {
  request.id = request.headers['x-request-id'] || 
               request.headers['x-correlation-id'] || 
               `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  reply.header('x-request-id', request.id);
});

// Schemas for legacy endpoints
const RegisterUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const VerifyIdentitySchema = z.object({
  userId: z.string().uuid(),
});

// Health check
app.get('/health', async () => ({ 
  status: 'ok', 
  name: 'identity-service', 
  version: '2.0.0',
  features: {
    jwt: true,
    rbac: true,
    sessions: true,
    passkeys: false // Will be enabled in next iteration
  },
  ts: new Date().toISOString() 
}));

// Register auth routes
await app.register(authRoutes, { prefix: '/api/v1' });

// Register user management routes  
await app.register(userRoutes, { prefix: '/api/v1' });

// Register organization routes
await app.register(organizationRoutes, { prefix: '/api/v1' });

// Register KYC routes
await app.register(kycRoutes, { prefix: '/api/v1' });

// Register passkey routes
await app.register(passkeyRoutes, { prefix: '/api/v1' });

// Legacy endpoints for backward compatibility
app.post('/api/v1/identity/register', async (req, reply) => {
  try {
    const data = RegisterUserSchema.parse(req.body);
    const names = data.name.split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    
    const result = await db.query(dbQueries.createUser, [
      data.email,
      firstName,
      lastName,
      'investor',
      'pending'
    ]);
    
    return reply.send({
      userId: result.rows[0].id,
      email: result.rows[0].email,
      name: `${result.rows[0].first_name} ${result.rows[0].last_name}`.trim(),
      status: 'pending_verification'
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return reply.status(409).send({ error: 'Email already registered' });
    }
    throw error;
  }
});

app.post('/api/v1/identity/verify', async (req, reply) => {
  const data = VerifyIdentitySchema.parse(req.body);
  
  const result = await db.query(dbQueries.getUserById, [data.userId]);
  
  if (result.rows.length === 0) {
    return reply.status(404).send({ error: 'User not found' });
  }
  
  const user = result.rows[0];
  return reply.send({
    userId: user.id,
    verified: user.kyc_status === 'approved',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/identity/:userId', async (req: any, reply) => {
  const { userId } = req.params;
  
  const result = await db.query(dbQueries.getUserById, [userId]);
  
  if (result.rows.length === 0) {
    return reply.status(404).send({ error: 'User not found' });
  }
  
  const user = result.rows[0];
  return reply.send({
    userId: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`.trim(),
    kycStatus: user.kyc_status,
    amlStatus: user.accreditation_status
  });
});

// Legacy passkey endpoint (will be replaced with WebAuthn implementation)
app.post('/auth/passkey/register', async (req, reply) => {
  return reply.send({ 
    challenge: 'mock-challenge', 
    rpId: 'localhost', 
    user: { id: 'demo', name: 'demo' },
    message: 'WebAuthn implementation coming in next iteration'
  });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error({ 
    err: error, 
    requestId: request.id,
    path: request.url 
  });
  
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.validation
    });
  }
  
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.errors
    });
  }
  
  return reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal server error',
    requestId: request.id
  });
});

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  app.log.info(`Received signal ${signal}, shutting down gracefully`);
  
  try {
    await app.close();
    await db.end();
    
    const { sessionManager } = await import('./auth/session.js');
    await sessionManager.disconnect();
    
    process.exit(0);
  } catch (err) {
    app.log.error('Error during shutdown', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => closeGracefully('SIGTERM'));
process.on('SIGINT', () => closeGracefully('SIGINT'));

// Start server
const port = Number(process.env.PORT || 3002);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Identity Service v2.0.0 listening on ${host}:${port}`);
  app.log.info('Features enabled: JWT Auth, RBAC, Session Management');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}