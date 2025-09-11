import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createRedisClient, createPostgresPool } from '@veria/database';
import { z } from 'zod';
import type { Pool } from 'pg';
import type Redis from 'ioredis';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'veria-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Initialize shared connections
let pgPool: Pool;
let redisClient: Redis;

// User roles and permissions
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  INVESTOR = 'investor',
  VIEWER = 'viewer'
}

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  // Policy permissions
  POLICY_READ = 'policy:read',
  POLICY_WRITE = 'policy:write',
  POLICY_DELETE = 'policy:delete',
  POLICY_EVALUATE = 'policy:evaluate',
  
  // Compliance permissions
  COMPLIANCE_READ = 'compliance:read',
  COMPLIANCE_WRITE = 'compliance:write',
  COMPLIANCE_OVERRIDE = 'compliance:override',
  
  // Transaction permissions
  TRANSACTION_READ = 'transaction:read',
  TRANSACTION_CREATE = 'transaction:create',
  TRANSACTION_APPROVE = 'transaction:approve',
  
  // Audit permissions
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export'
}

// Role-permission mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission), // All permissions
  [UserRole.OPERATOR]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.POLICY_READ,
    Permission.POLICY_WRITE,
    Permission.POLICY_EVALUATE,
    Permission.COMPLIANCE_READ,
    Permission.COMPLIANCE_WRITE,
    Permission.TRANSACTION_READ,
    Permission.TRANSACTION_CREATE,
    Permission.TRANSACTION_APPROVE,
    Permission.AUDIT_READ
  ],
  [UserRole.INVESTOR]: [
    Permission.USER_READ,
    Permission.POLICY_READ,
    Permission.COMPLIANCE_READ,
    Permission.TRANSACTION_READ,
    Permission.TRANSACTION_CREATE,
    Permission.AUDIT_READ
  ],
  [UserRole.VIEWER]: [
    Permission.USER_READ,
    Permission.POLICY_READ,
    Permission.COMPLIANCE_READ,
    Permission.TRANSACTION_READ,
    Permission.AUDIT_READ
  ]
};

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  sessionId?: string;
}

// Request schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string()
});

// Initialize middleware
export async function initializeAuth(app: FastifyInstance) {
  // Initialize database connections if not already done
  if (!pgPool) {
    pgPool = createPostgresPool();
  }
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  
  // Register JWT plugin
  await app.register(import('@fastify/jwt'), {
    secret: JWT_SECRET,
    sign: {
      expiresIn: JWT_EXPIRY
    }
  });
  
  // Decorate request with user
  app.decorateRequest('user', null);
  
  // Authentication routes
  app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = LoginSchema.parse(request.body);
      
      // Query user from database
      const userResult = await pgPool.query(
        'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        return reply.status(401).send({
          success: false,
          errors: [{ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }]
        });
      }
      
      const user = userResult.rows[0];
      
      // Check if user is active
      if (user.status !== 'active') {
        return reply.status(403).send({
          success: false,
          errors: [{ code: 'ACCOUNT_INACTIVE', message: 'Account is not active' }]
        });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return reply.status(401).send({
          success: false,
          errors: [{ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }]
        });
      }
      
      // Generate session ID
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create token payload
      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        permissions: rolePermissions[user.role as UserRole] || [],
        sessionId
      };
      
      // Generate tokens
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as jwt.SignOptions);
      const refreshToken = jwt.sign(
        { userId: user.id, sessionId, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
      );
      
      // Store session in Redis
      await redisClient.setex(
        `session:${sessionId}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          loginAt: new Date().toISOString()
        })
      );
      
      // Store refresh token
      await redisClient.setex(
        `refresh:${refreshToken}`,
        7 * 24 * 60 * 60,
        JSON.stringify({ userId: user.id, sessionId })
      );
      
      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: payload.permissions
          }
        }
      };
    } catch (error) {
      app.log.error(error, 'Login failed');
      return reply.status(500).send({
        success: false,
        errors: [{ code: 'LOGIN_ERROR', message: 'Login failed' }]
      });
    }
  });
  
  app.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(request.body);
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      
      // Check if refresh token exists in Redis
      const tokenData = await redisClient.get(`refresh:${refreshToken}`);
      if (!tokenData) {
        return reply.status(401).send({
          success: false,
          errors: [{ code: 'INVALID_TOKEN', message: 'Invalid refresh token' }]
        });
      }
      
      // Get user data
      const userResult = await pgPool.query(
        'SELECT id, email, role, status FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
        return reply.status(401).send({
          success: false,
          errors: [{ code: 'USER_NOT_FOUND', message: 'User not found or inactive' }]
        });
      }
      
      const user = userResult.rows[0];
      
      // Generate new access token
      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        permissions: rolePermissions[user.role as UserRole] || [],
        sessionId: decoded.sessionId
      };
      
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as jwt.SignOptions);
      
      return {
        success: true,
        data: { accessToken }
      };
    } catch (error) {
      app.log.error(error, 'Token refresh failed');
      return reply.status(401).send({
        success: false,
        errors: [{ code: 'REFRESH_ERROR', message: 'Token refresh failed' }]
      });
    }
  });
  
  app.post('/auth/logout', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return { success: true };
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      
      // Delete session from Redis
      if (decoded.sessionId) {
        await redisClient.del(`session:${decoded.sessionId}`);
      }
      
      // Blacklist the token
      await redisClient.setex(
        `blacklist:${token}`,
        24 * 60 * 60, // 24 hours
        '1'
      );
      
      return { success: true };
    } catch (error) {
      app.log.error(error, 'Logout failed');
      return { success: true }; // Always return success for logout
    }
  });
}

// Authentication middleware
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.status(401).send({
        success: false,
        errors: [{ code: 'NO_TOKEN', message: 'No authentication token provided' }]
      });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return reply.status(401).send({
        success: false,
        errors: [{ code: 'TOKEN_BLACKLISTED', message: 'Token has been revoked' }]
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Check if session exists
    if (decoded.sessionId) {
      const session = await redisClient.get(`session:${decoded.sessionId}`);
      if (!session) {
        return reply.status(401).send({
          success: false,
          errors: [{ code: 'SESSION_EXPIRED', message: 'Session has expired' }]
        });
      }
    }
    
    // Attach user to request
    (request as any).user = decoded;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      errors: [{ code: 'INVALID_TOKEN', message: 'Invalid authentication token' }]
    });
  }
}

// Authorization middleware factory
export function authorize(...requiredPermissions: Permission[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user as TokenPayload;
    
    if (!user) {
      return reply.status(401).send({
        success: false,
        errors: [{ code: 'NOT_AUTHENTICATED', message: 'Authentication required' }]
      });
    }
    
    // Check if user has required permissions
    const hasPermission = requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        errors: [{ 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Insufficient permissions for this operation',
          required: requiredPermissions,
          userPermissions: user.permissions
        }]
      });
    }
  };
}

// Rate limiting middleware
export async function rateLimit(
  request: FastifyRequest, 
  reply: FastifyReply,
  options: { 
    window?: number; // Time window in seconds
    limit?: number;  // Request limit
    keyGenerator?: (req: FastifyRequest) => string;
  } = {}
) {
  const window = options.window || 60; // 1 minute default
  const limit = options.limit || 100; // 100 requests default
  const keyGenerator = options.keyGenerator || ((req) => {
    const user = (req as any).user;
    return user ? `rate:${user.userId}` : `rate:${req.ip}`;
  });
  
  const key = keyGenerator(request);
  const current = await redisClient.incr(key);
  
  if (current === 1) {
    await redisClient.expire(key, window);
  }
  
  if (current > limit) {
    return reply.status(429).send({
      success: false,
      errors: [{ 
        code: 'RATE_LIMIT_EXCEEDED', 
        message: 'Too many requests',
        retryAfter: window
      }]
    });
  }
  
  reply.header('X-RateLimit-Limit', limit.toString());
  reply.header('X-RateLimit-Remaining', (limit - current).toString());
  reply.header('X-RateLimit-Reset', new Date(Date.now() + window * 1000).toISOString());
}

// API key authentication for service-to-service communication
export async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return reply.status(401).send({
      success: false,
      errors: [{ code: 'NO_API_KEY', message: 'No API key provided' }]
    });
  }
  
  // Validate API key from database
  const result = await pgPool.query(
    'SELECT service_name, permissions FROM api_keys WHERE key = $1 AND status = $2',
    [apiKey, 'active']
  );
  
  if (result.rows.length === 0) {
    return reply.status(401).send({
      success: false,
      errors: [{ code: 'INVALID_API_KEY', message: 'Invalid API key' }]
    });
  }
  
  const apiKeyData = result.rows[0];
  
  // Attach service info to request
  (request as any).service = {
    name: apiKeyData.service_name,
    permissions: apiKeyData.permissions
  };
}

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Helper function to generate API keys
export function generateApiKey(): string {
  const prefix = 'veria';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

// Export everything
export default {
  initializeAuth,
  authenticate,
  authorize,
  rateLimit,
  authenticateApiKey,
  hashPassword,
  generateApiKey,
  UserRole,
  Permission,
  rolePermissions
};