import pg from 'pg';
import Redis from 'ioredis';

const { Pool } = pg;

// PostgreSQL connection
export const createPostgresPool = (config?: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}) => {
  return new Pool({
    host: config?.host || process.env.POSTGRES_HOST || 'localhost',
    port: config?.port || parseInt(process.env.POSTGRES_PORT || '5432'),
    database: config?.database || process.env.POSTGRES_DB || 'veria',
    user: config?.user || process.env.POSTGRES_USER || 'veria',
    password: config?.password || process.env.POSTGRES_PASSWORD || 'veria123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

// Redis connection
export const createRedisClient = (config?: {
  host?: string;
  port?: number;
  password?: string;
}) => {
  return new Redis({
    host: config?.host || process.env.REDIS_HOST || 'localhost',
    port: config?.port || parseInt(process.env.REDIS_PORT || '6379'),
    password: config?.password || process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
};

// Database queries
export const dbQueries = {
  // User queries
  createUser: `
    INSERT INTO users (email, first_name, last_name, role, kyc_status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  getUserById: `
    SELECT * FROM users WHERE id = $1
  `,
  
  getUserByEmail: `
    SELECT * FROM users WHERE email = $1
  `,
  
  updateUserKycStatus: `
    UPDATE users 
    SET kyc_status = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Policy queries
  createPolicy: `
    INSERT INTO policies (name, description, rules, status, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  getPolicyById: `
    SELECT * FROM policies WHERE id = $1
  `,
  
  evaluatePolicy: `
    INSERT INTO policy_evaluations (policy_id, user_id, decision, reasons, context)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  // Compliance queries
  createComplianceCheck: `
    INSERT INTO compliance_checks (transaction_id, user_id, check_type, status, result)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  getComplianceChecksByTransaction: `
    SELECT * FROM compliance_checks WHERE transaction_id = $1
  `,
  
  // Audit queries
  createAuditLog: `
    INSERT INTO audit_logs (event_type, service_name, user_id, resource_id, action, details, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `,
  
  getAuditLogs: `
    SELECT * FROM audit_logs 
    WHERE ($1::VARCHAR IS NULL OR event_type = $1)
    AND ($2::UUID IS NULL OR user_id = $2)
    AND ($3::TIMESTAMP IS NULL OR created_at >= $3)
    AND ($4::TIMESTAMP IS NULL OR created_at <= $4)
    ORDER BY created_at DESC
    LIMIT $5 OFFSET $6
  `,
};

export default {
  createPostgresPool,
  createRedisClient,
  dbQueries,
};