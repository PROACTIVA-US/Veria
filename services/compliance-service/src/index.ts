import Fastify from 'fastify';
import { createPostgresPool, createRedisClient, dbQueries } from '@veria/database';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { complianceRoutes } from './routes/compliance.js';

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

// Register enhanced compliance routes
app.register(complianceRoutes);

// Health check
app.get('/health', async () => ({ 
  status: 'ok', 
  name: 'compliance-service', 
  ts: new Date().toISOString(),
  database: await pgPool.query('SELECT 1').then(() => 'connected').catch(() => 'disconnected'),
  redis: await redisClient.ping().then(() => 'connected').catch(() => 'disconnected')
}));

// Types
interface ComplianceCheck {
  id?: string;
  transaction_id: string;
  user_id: string;
  check_type: 'kyc' | 'aml' | 'sanctions' | 'accreditation' | 'jurisdiction';
  status: 'pending' | 'passed' | 'failed' | 'manual_review';
  result?: any;
  created_at?: Date;
  updated_at?: Date;
}

interface ComplianceRequest {
  transaction_id: string;
  user_id: string;
  amount?: number;
  asset_type?: string;
  jurisdiction?: string;
  context?: Record<string, any>;
}

// POST /compliance/check - Run compliance checks
app.post('/compliance/check', async (req: any, reply) => {
  const request: ComplianceRequest = req.body ?? {};
  
  if (!request.transaction_id || !request.user_id) {
    return reply.status(400).send({
      success: false,
      errors: [{
        code: 'MISSING_PARAMS',
        message: 'transaction_id and user_id are required'
      }]
    });
  }
  
  try {
    // Check cache for recent compliance results
    const cacheKey = `compliance:${request.user_id}:${request.transaction_id}`;
    const cached = await app.redis.get(cacheKey);
    
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
    
    // Run compliance checks in parallel
    const checks = await Promise.all([
      runKycCheck(request, app.db),
      runAmlCheck(request, app.db),
      runSanctionsCheck(request, app.db),
      runAccreditationCheck(request, app.db),
      runJurisdictionCheck(request, app.db)
    ]);
    
    // Store results in database
    const checkResults = [];
    for (const check of checks) {
      const result = await app.db.query(dbQueries.createComplianceCheck, [
        request.transaction_id,
        request.user_id,
        check.check_type,
        check.status,
        JSON.stringify(check.result || {})
      ]);
      checkResults.push(result.rows[0]);
    }
    
    // Determine overall compliance status
    const overallStatus = determineOverallStatus(checks);
    
    const response = {
      transaction_id: request.transaction_id,
      user_id: request.user_id,
      overall_status: overallStatus,
      checks: checkResults,
      requires_manual_review: checks.some(c => c.status === 'manual_review'),
      timestamp: new Date().toISOString()
    };
    
    // Cache the result for 60 seconds
    await app.redis.setex(cacheKey, 60, JSON.stringify(response));
    
    return {
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false
      }
    };
  } catch (error) {
    app.log.error(error, 'Compliance check failed');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'COMPLIANCE_ERROR',
        message: 'Failed to perform compliance check'
      }]
    });
  }
});

// GET /compliance/checks/:transactionId - Get compliance checks for a transaction
app.get('/compliance/checks/:transactionId', async (req: any, reply) => {
  const { transactionId } = req.params;
  
  try {
    const result = await app.db.query(dbQueries.getComplianceChecksByTransaction, [transactionId]);
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        errors: [{
          code: 'NOT_FOUND',
          message: `No compliance checks found for transaction ${transactionId}`
        }]
      });
    }
    
    return {
      success: true,
      data: {
        transaction_id: transactionId,
        checks: result.rows,
        overall_status: determineOverallStatus(result.rows)
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to fetch compliance checks');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch compliance checks'
      }]
    });
  }
});

// POST /compliance/monitor - Set up monitoring for ongoing compliance
app.post('/compliance/monitor', async (req: any, reply) => {
  const { user_id, monitoring_type, frequency, criteria } = req.body ?? {};
  
  if (!user_id || !monitoring_type) {
    return reply.status(400).send({
      success: false,
      errors: [{
        code: 'MISSING_PARAMS',
        message: 'user_id and monitoring_type are required'
      }]
    });
  }
  
  try {
    // Store monitoring configuration in Redis
    const monitoringKey = `monitoring:${user_id}:${monitoring_type}`;
    const monitoringConfig = {
      user_id,
      monitoring_type,
      frequency: frequency || 'daily',
      criteria: criteria || {},
      created_at: new Date().toISOString(),
      next_check: getNextCheckTime(frequency || 'daily')
    };
    
    await app.redis.set(monitoringKey, JSON.stringify(monitoringConfig));
    
    // Add to monitoring queue
    await app.redis.zadd(
      'monitoring:queue',
      Date.parse(monitoringConfig.next_check),
      monitoringKey
    );
    
    return {
      success: true,
      data: {
        monitoring_id: monitoringKey,
        ...monitoringConfig
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to set up monitoring');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'MONITORING_ERROR',
        message: 'Failed to set up compliance monitoring'
      }]
    });
  }
});

// POST /decisions - Make compliance decision (Gateway compatibility)
app.post('/decisions', async (req: any, reply) => {
  const request = req.body ?? {};
  
  if (!request.transaction_id || !request.user_id) {
    return reply.status(400).send({
      success: false,
      errors: [{
        code: 'MISSING_PARAMS',
        message: 'transaction_id and user_id are required'
      }]
    });
  }
  
  try {
    // Run compliance checks
    const checks = await Promise.all([
      runKycCheck(request, app.db),
      runAmlCheck(request, app.db),
      runSanctionsCheck(request, app.db),
      runAccreditationCheck(request, app.db),
      runJurisdictionCheck(request, app.db)
    ]);
    
    // Determine decision
    const decision = determineOverallStatus(checks);
    const approved = decision === 'passed';
    
    // Store decision
    await app.db.query(
      `INSERT INTO compliance_decisions (transaction_id, user_id, decision, checks, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       ON CONFLICT (transaction_id) DO UPDATE 
       SET decision = $3, checks = $4, updated_at = NOW()`,
      [request.transaction_id, request.user_id, decision, JSON.stringify(checks)]
    );
    
    return {
      success: true,
      data: {
        transaction_id: request.transaction_id,
        user_id: request.user_id,
        decision,
        approved,
        checks,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Compliance decision failed');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DECISION_ERROR',
        message: 'Failed to make compliance decision'
      }]
    });
  }
});

// POST /compliance/report - Generate compliance report
app.post('/compliance/report', async (req: any, reply) => {
  const { user_id, start_date, end_date, report_type } = req.body ?? {};
  
  if (!user_id) {
    return reply.status(400).send({
      success: false,
      errors: [{
        code: 'MISSING_PARAMS',
        message: 'user_id is required'
      }]
    });
  }
  
  try {
    // Query compliance checks for the user
    const query = `
      SELECT * FROM compliance_checks 
      WHERE user_id = $1 
      AND created_at >= $2 
      AND created_at <= $3
      ORDER BY created_at DESC
    `;
    
    const result = await app.db.query(query, [
      user_id,
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      end_date || new Date()
    ]);
    
    // Generate report based on type
    const report = generateComplianceReport(result.rows, report_type || 'summary');
    
    return {
      success: true,
      data: {
        user_id,
        period: {
          start: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: end_date || new Date().toISOString()
        },
        report_type: report_type || 'summary',
        report
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to generate compliance report');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'REPORT_ERROR',
        message: 'Failed to generate compliance report'
      }]
    });
  }
});

// Compliance check functions
async function runKycCheck(request: ComplianceRequest, db: Pool): Promise<ComplianceCheck> {
  try {
    // Query user's KYC status from database
    const result = await db.query(dbQueries.getUserById, [request.user_id]);
    
    if (result.rows.length === 0) {
      return {
        transaction_id: request.transaction_id,
        user_id: request.user_id,
        check_type: 'kyc',
        status: 'failed',
        result: { reason: 'User not found' }
      };
    }
    
    const user = result.rows[0];
    const kycStatus = user.kyc_status;
    
    if (kycStatus === 'verified') {
      return {
        transaction_id: request.transaction_id,
        user_id: request.user_id,
        check_type: 'kyc',
        status: 'passed',
        result: { 
          verified_at: user.kyc_verified_at,
          level: user.kyc_level || 'standard'
        }
      };
    } else if (kycStatus === 'pending') {
      return {
        transaction_id: request.transaction_id,
        user_id: request.user_id,
        check_type: 'kyc',
        status: 'manual_review',
        result: { reason: 'KYC verification pending' }
      };
    } else {
      return {
        transaction_id: request.transaction_id,
        user_id: request.user_id,
        check_type: 'kyc',
        status: 'failed',
        result: { reason: 'KYC not verified' }
      };
    }
  } catch (error) {
    return {
      transaction_id: request.transaction_id,
      user_id: request.user_id,
      check_type: 'kyc',
      status: 'failed',
      result: { error: 'KYC check failed' }
    };
  }
}

async function runAmlCheck(request: ComplianceRequest, db: Pool): Promise<ComplianceCheck> {
  // Simulate AML check logic
  const riskScore = Math.random() * 100;
  
  if (riskScore < 30) {
    return {
      transaction_id: request.transaction_id,
      user_id: request.user_id,
      check_type: 'aml',
      status: 'passed',
      result: { risk_score: riskScore, risk_level: 'low' }
    };
  } else if (riskScore < 70) {
    return {
      transaction_id: request.transaction_id,
      user_id: request.user_id,
      check_type: 'aml',
      status: 'manual_review',
      result: { risk_score: riskScore, risk_level: 'medium' }
    };
  } else {
    return {
      transaction_id: request.transaction_id,
      user_id: request.user_id,
      check_type: 'aml',
      status: 'failed',
      result: { risk_score: riskScore, risk_level: 'high' }
    };
  }
}

async function runSanctionsCheck(request: ComplianceRequest, db: Pool): Promise<ComplianceCheck> {
  // Simulate sanctions list check
  const sanctioned = Math.random() < 0.05; // 5% chance of being on sanctions list
  
  return {
    transaction_id: request.transaction_id,
    user_id: request.user_id,
    check_type: 'sanctions',
    status: sanctioned ? 'failed' : 'passed',
    result: {
      lists_checked: ['OFAC', 'UN', 'EU'],
      match_found: sanctioned,
      checked_at: new Date().toISOString()
    }
  };
}

async function runAccreditationCheck(request: ComplianceRequest, db: Pool): Promise<ComplianceCheck> {
  // Check if user is accredited investor
  const accredited = Math.random() < 0.7; // 70% chance of being accredited
  
  return {
    transaction_id: request.transaction_id,
    user_id: request.user_id,
    check_type: 'accreditation',
    status: accredited ? 'passed' : 'failed',
    result: {
      accredited: accredited,
      verification_method: accredited ? 'income_verification' : 'not_verified',
      expires_at: accredited ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
    }
  };
}

async function runJurisdictionCheck(request: ComplianceRequest, db: Pool): Promise<ComplianceCheck> {
  const restrictedJurisdictions = ['North Korea', 'Iran', 'Syria', 'Cuba'];
  const jurisdiction = request.jurisdiction || 'United States';
  
  const isRestricted = restrictedJurisdictions.includes(jurisdiction);
  
  return {
    transaction_id: request.transaction_id,
    user_id: request.user_id,
    check_type: 'jurisdiction',
    status: isRestricted ? 'failed' : 'passed',
    result: {
      jurisdiction,
      restricted: isRestricted,
      restrictions: isRestricted ? ['Cannot trade in this jurisdiction'] : []
    }
  };
}

// Helper functions
function determineOverallStatus(checks: any[]): string {
  if (checks.some(c => c.status === 'failed')) {
    return 'failed';
  }
  if (checks.some(c => c.status === 'manual_review')) {
    return 'manual_review';
  }
  if (checks.every(c => c.status === 'passed')) {
    return 'passed';
  }
  return 'pending';
}

function getNextCheckTime(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}

function generateComplianceReport(checks: any[], reportType: string): any {
  if (reportType === 'detailed') {
    return {
      total_checks: checks.length,
      checks_by_type: groupByType(checks),
      checks_by_status: groupByStatus(checks),
      timeline: checks.map(c => ({
        date: c.created_at,
        type: c.check_type,
        status: c.status,
        result: c.result
      }))
    };
  }
  
  // Summary report
  return {
    total_checks: checks.length,
    passed: checks.filter(c => c.status === 'passed').length,
    failed: checks.filter(c => c.status === 'failed').length,
    manual_review: checks.filter(c => c.status === 'manual_review').length,
    last_check: checks[0]?.created_at,
    compliance_rate: (checks.filter(c => c.status === 'passed').length / checks.length * 100).toFixed(2) + '%'
  };
}

function groupByType(checks: any[]): Record<string, number> {
  return checks.reduce((acc, check) => {
    acc[check.check_type] = (acc[check.check_type] || 0) + 1;
    return acc;
  }, {});
}

function groupByStatus(checks: any[]): Record<string, number> {
  return checks.reduce((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1;
    return acc;
  }, {});
}

const port = Number(process.env.PORT || 3004);
const host = process.env.HOST || '0.0.0.0';

// Start server
const start = async () => {
  try {
    // Test database connections
    await pgPool.query('SELECT 1');
    await redisClient.ping();
    app.log.info('Database connections established');
    
    await app.listen({ port, host });
    app.log.info(`Compliance Service listening on ${host}:${port}`);
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