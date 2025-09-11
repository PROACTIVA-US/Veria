import Fastify from 'fastify';
import { createPostgresPool, createRedisClient, dbQueries } from '@veria/database';
import type { Pool } from 'pg';
import type Redis from 'ioredis';

const app = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Initialize database connections
const pgPool: Pool = createPostgresPool();
const redisClient: Redis = createRedisClient();

// Extend Fastify instance with database clients
declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
    redis: Redis;
  }
}

app.decorate('db', pgPool);
app.decorate('redis', redisClient);

// Health check
app.get('/health', async () => ({ 
  status: 'ok', 
  name: 'policy-service', 
  ts: new Date().toISOString(),
  database: await pgPool.query('SELECT 1').then(() => 'connected').catch(() => 'disconnected'),
  redis: await redisClient.ping().then(() => 'connected').catch(() => 'disconnected')
}));

type Policy = { 
  id: string; 
  name: string; 
  description?: string;
  version: string; 
  rules: any;
  status: 'draft' | 'active' | 'archived';
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
};

// GET /policies - List all policies
app.get('/policies', async (req, reply) => {
  try {
    const result = await app.db.query('SELECT * FROM policies ORDER BY created_at DESC');
    
    return {
      success: true,
      data: result.rows,
      meta: {
        total: result.rowCount,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to fetch policies');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch policies'
      }]
    });
  }
});

// GET /policies/:id - Get policy by ID
app.get('/policies/:id', async (req: any, reply) => {
  const { id } = req.params;
  
  try {
    // Check cache first
    const cached = await app.redis.get(`policy:${id}`);
    if (cached) {
      return {
        success: true,
        data: JSON.parse(cached),
        meta: {
          timestamp: new Date().toISOString(),
          cached: true
        }
      };
    }
    
    // Query database
    const result = await app.db.query(dbQueries.getPolicyById, [id]);
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        errors: [{
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${id} not found`
        }]
      });
    }
    
    const policy = result.rows[0];
    
    // Cache the result for 5 minutes
    await app.redis.setex(`policy:${id}`, 300, JSON.stringify(policy));
    
    return {
      success: true,
      data: policy,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to fetch policy');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch policy'
      }]
    });
  }
});

// POST /policies - Create new policy
app.post('/policies', async (req: any, reply) => {
  const body = req.body ?? {};
  
  try {
    const result = await app.db.query(dbQueries.createPolicy, [
      body.name || 'Unnamed Policy',
      body.description || null,
      JSON.stringify(body.rules || {}),
      body.status || 'draft',
      body.created_by || null
    ]);
    
    const policy = result.rows[0];
    
    // Invalidate cache
    await app.redis.del('policies:*');
    
    return reply.code(201).send({
      success: true,
      data: policy,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    app.log.error(error, 'Failed to create policy');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DATABASE_ERROR',
        message: 'Failed to create policy'
      }]
    });
  }
});

// POST /policies/:id/evaluate - Evaluate policy
app.post('/policies/:id/evaluate', async (req: any, reply) => {
  const { id } = req.params;
  const { user_id, context } = req.body ?? {};
  
  try {
    // Get policy
    const policyResult = await app.db.query(dbQueries.getPolicyById, [id]);
    
    if (policyResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        errors: [{
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${id} not found`
        }]
      });
    }
    
    const policy = policyResult.rows[0];
    const rules = policy.rules;
    
    // Evaluate policy rules
    const evaluation = await evaluatePolicyRules(rules, context);
    
    // Store evaluation result
    const evalResult = await app.db.query(dbQueries.evaluatePolicy, [
      id,
      user_id || null,
      evaluation.decision,
      JSON.stringify(evaluation.reasons),
      JSON.stringify(context || {})
    ]);
    
    return {
      success: true,
      data: {
        evaluation_id: evalResult.rows[0].id,
        decision: evaluation.decision,
        reasons: evaluation.reasons,
        policy_id: id,
        policy_name: policy.name,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Policy evaluation failed');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'EVALUATION_ERROR',
        message: 'Policy evaluation failed'
      }]
    });
  }
});

// POST /policies/validate - Validate policy configuration
app.post('/policies/validate', async (req: any, reply) => {
  try {
    const policyData = req.body ?? {};
    
    // Basic validation logic
    const validationResults = validatePolicy(policyData);
    
    return {
      success: true,
      data: {
        valid: validationResults.valid,
        errors: validationResults.errors,
        warnings: validationResults.warnings,
        metadata: {
          policy_name: policyData.metadata?.name || 'Unknown',
          version: policyData.version || '0.1'
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    app.log.error(error, 'Policy validation failed');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'VALIDATION_ERROR',
        message: 'Policy validation failed'
      }]
    });
  }
});

// POST /policies/simulate - Simulate policy execution
app.post('/policies/simulate', async (req: any, reply) => {
  const { policy_id, context } = req.body ?? {};
  
  try {
    let policy;
    
    if (policy_id) {
      const result = await app.db.query(dbQueries.getPolicyById, [policy_id]);
      if (result.rows.length > 0) {
        policy = result.rows[0];
      }
    }
    
    const simulation = await simulatePolicy(policy, context);
    
    return {
      success: true,
      data: simulation,
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Policy simulation failed');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'SIMULATION_ERROR',
        message: 'Policy simulation failed'
      }]
    });
  }
});

// Policy evaluation function
async function evaluatePolicyRules(rules: any, context: any) {
  const reasons: string[] = [];
  let decision: 'allow' | 'deny' = 'allow';
  
  // KYC check
  if (rules.kyc_required && !context.kyc_verified) {
    decision = 'deny';
    reasons.push('KYC verification required');
  }
  
  // Accreditation check
  if (rules.accreditation_required && !context.accredited_investor) {
    decision = 'deny';
    reasons.push('Accredited investor status required');
  }
  
  // Jurisdiction check
  if (rules.allowed_jurisdictions && context.jurisdiction) {
    if (!rules.allowed_jurisdictions.includes(context.jurisdiction)) {
      decision = 'deny';
      reasons.push(`Jurisdiction ${context.jurisdiction} not allowed`);
    }
  }
  
  // Investment limits
  if (rules.min_investment && context.investment_amount) {
    if (context.investment_amount < rules.min_investment) {
      decision = 'deny';
      reasons.push(`Investment amount below minimum of ${rules.min_investment}`);
    }
  }
  
  if (rules.max_investment && context.investment_amount) {
    if (context.investment_amount > rules.max_investment) {
      decision = 'deny';
      reasons.push(`Investment amount exceeds maximum of ${rules.max_investment}`);
    }
  }
  
  return { decision, reasons };
}

// Policy simulation function
async function simulatePolicy(policy: any, context: any) {
  const scenarios = [];
  
  // Simulate different scenarios
  const testContexts = [
    { ...context, kyc_verified: true, accredited_investor: true },
    { ...context, kyc_verified: true, accredited_investor: false },
    { ...context, kyc_verified: false, accredited_investor: true },
    { ...context, kyc_verified: false, accredited_investor: false }
  ];
  
  for (const testContext of testContexts) {
    if (policy) {
      const evaluation = await evaluatePolicyRules(policy.rules, testContext);
      scenarios.push({
        context: testContext,
        outcome: evaluation.decision,
        reasons: evaluation.reasons
      });
    } else {
      scenarios.push({
        context: testContext,
        outcome: 'allow',
        reasons: ['No policy specified']
      });
    }
  }
  
  return {
    policy_name: policy?.name || 'No Policy',
    policy_version: policy?.version || '0.1',
    scenarios,
    summary: {
      total_scenarios: scenarios.length,
      allowed: scenarios.filter(s => s.outcome === 'allow').length,
      denied: scenarios.filter(s => s.outcome === 'deny').length
    }
  };
}

// Basic policy validation function
function validatePolicy(policy: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!policy.version) {
    errors.push('Policy version is required');
  }
  
  if (!policy.metadata?.name) {
    warnings.push('Policy name is recommended');
  }
  
  if (!policy.metadata?.jurisdiction || !Array.isArray(policy.metadata.jurisdiction)) {
    warnings.push('Policy jurisdiction should be specified as an array');
  }
  
  // Requirements validation
  if (policy.requirements) {
    if (policy.requirements.sanctions && !['none', 'cleared', 'monitoring'].includes(policy.requirements.sanctions)) {
      errors.push('Invalid sanctions requirement value');
    }
    
    if (policy.requirements.accreditation && typeof policy.requirements.accreditation !== 'object') {
      warnings.push('Accreditation requirements should be an object');
    }
  }
  
  // Limits validation
  if (policy.limits) {
    if (policy.limits.per_investor_usd_total && typeof policy.limits.per_investor_usd_total !== 'number') {
      errors.push('per_investor_usd_total must be a number');
    }
    
    if (policy.limits.min_investment && policy.limits.max_investment) {
      if (policy.limits.min_investment > policy.limits.max_investment) {
        errors.push('min_investment cannot be greater than max_investment');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

const port = Number(process.env.PORT || 3003);
const host = process.env.HOST || '0.0.0.0';

// Start server
const start = async () => {
  try {
    // Test database connections
    await pgPool.query('SELECT 1');
    await redisClient.ping();
    app.log.info('Database connections established');
    
    await app.listen({ port, host });
    app.log.info(`Policy Service listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully');
  await app.close();
  await pgPool.end();
  redisClient.disconnect();
  process.exit(0);
});

start();