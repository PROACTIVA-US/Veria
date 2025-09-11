import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../auth/password.js';
import { generateTokens, verifyRefreshToken } from '../auth/jwt.js';
import { sessionManager } from '../auth/session.js';
import { Role } from '../auth/rbac.js';
import { randomUUID } from 'crypto';

// Request/Response schemas
const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationId: z.string().uuid().optional()
});

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string()
});

const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
});

const ResetPasswordRequestSchema = z.object({
  email: z.string().email()
});

const ConfirmResetPasswordRequestSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

export async function authRoutes(app: FastifyInstance) {
  const db = (app as any).db; // Assumes database is attached to app
  
  // Register new user
  app.post('/auth/register', async (request, reply) => {
    try {
      const data = RegisterRequestSchema.parse(request.body);
      
      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.valid) {
        return reply.status(400).send({
          error: 'Invalid password',
          details: passwordValidation.errors
        });
      }
      
      // Hash password
      const passwordHash = await hashPassword(data.password);
      
      // Check if email already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );
      
      if (existingUser.rows.length > 0) {
        return reply.status(409).send({
          error: 'Email already registered'
        });
      }
      
      // Create user with transaction
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Insert user
        const userResult = await client.query(
          `INSERT INTO users (
            id, email, password_hash, first_name, last_name, 
            user_type, kyc_status, email_verified, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING id, email, first_name, last_name`,
          [
            randomUUID(),
            data.email,
            passwordHash,
            data.firstName,
            data.lastName,
            'investor',
            'pending',
            false
          ]
        );
        
        const user = userResult.rows[0];
        
        // Assign default role
        await client.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_at)
           VALUES ($1, (SELECT id FROM roles WHERE name = $2), NOW())`,
          [user.id, Role.INVESTOR]
        );
        
        await client.query('COMMIT');
        
        // Create session
        const session = await sessionManager.createSession({
          userId: user.id,
          email: user.email,
          roles: [Role.INVESTOR],
          organizationId: data.organizationId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        });
        
        // Generate tokens
        const tokens = generateTokens({
          userId: user.id,
          email: user.email,
          roles: [Role.INVESTOR],
          organizationId: data.organizationId,
          sessionId: session.id
        }, app);
        
        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roles: [Role.INVESTOR]
          },
          ...tokens
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      throw error;
    }
  });
  
  // Login
  app.post('/auth/login', async (request, reply) => {
    try {
      const data = LoginRequestSchema.parse(request.body);
      
      // Get user with password hash
      const userResult = await db.query(
        `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
                u.locked_until, u.failed_login_attempts,
                array_agg(r.name) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.email = $1
         GROUP BY u.id`,
        [data.email]
      );
      
      if (userResult.rows.length === 0) {
        return reply.status(401).send({
          error: 'Invalid email or password'
        });
      }
      
      const user = userResult.rows[0];
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return reply.status(423).send({
          error: 'Account locked',
          lockedUntil: user.locked_until
        });
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(data.password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        let lockedUntil = null;
        
        if (failedAttempts >= 5) {
          // Lock account for 30 minutes
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        
        await db.query(
          `UPDATE users SET 
           failed_login_attempts = $1,
           locked_until = $2
           WHERE id = $3`,
          [failedAttempts, lockedUntil, user.id]
        );
        
        return reply.status(401).send({
          error: 'Invalid email or password',
          remainingAttempts: Math.max(0, 5 - failedAttempts)
        });
      }
      
      // Reset failed attempts on successful login
      await db.query(
        `UPDATE users SET 
         failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
      
      // Create session
      const session = await sessionManager.createSession({
        userId: user.id,
        email: user.email,
        roles: user.roles || [Role.INVESTOR],
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });
      
      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        roles: user.roles || [Role.INVESTOR],
        sessionId: session.id
      }, app);
      
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: user.roles || [Role.INVESTOR]
        },
        ...tokens
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      throw error;
    }
  });
  
  // Logout
  app.post('/auth/logout', async (request, reply) => {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'No authorization header' });
    }
    
    try {
      const token = authorization.replace('Bearer ', '');
      const decoded = await app.jwt.verify(token);
      
      // Delete session
      await sessionManager.deleteSession(decoded.sessionId);
      
      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
  
  // Refresh token
  app.post('/auth/refresh', async (request, reply) => {
    try {
      const data = RefreshTokenRequestSchema.parse(request.body);
      
      // Verify refresh token
      const decoded = await verifyRefreshToken(data.refreshToken, app);
      
      // Get session
      const session = await sessionManager.getSession(decoded.sessionId);
      if (!session) {
        return reply.status(401).send({ error: 'Session expired' });
      }
      
      // Refresh session
      const refreshedSession = await sessionManager.refreshSession(decoded.sessionId);
      if (!refreshedSession) {
        return reply.status(401).send({ error: 'Failed to refresh session' });
      }
      
      // Generate new tokens
      const tokens = generateTokens({
        userId: refreshedSession.userId,
        email: refreshedSession.email,
        roles: refreshedSession.roles,
        organizationId: refreshedSession.organizationId,
        sessionId: refreshedSession.id
      }, app);
      
      return reply.send(tokens);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });
  
  // Get current user
  app.get('/auth/me', async (request, reply) => {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'No authorization header' });
    }
    
    try {
      const token = authorization.replace('Bearer ', '');
      const decoded = await app.jwt.verify(token);
      
      // Get user details
      const userResult = await db.query(
        `SELECT u.id, u.email, u.first_name, u.last_name,
                u.user_type, u.kyc_status, u.email_verified,
                array_agg(r.name) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.id = $1
         GROUP BY u.id`,
        [decoded.userId]
      );
      
      if (userResult.rows.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      return reply.send({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        kycStatus: user.kyc_status,
        emailVerified: user.email_verified,
        roles: user.roles || []
      });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
  
  // Change password
  app.post('/auth/change-password', async (request, reply) => {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'No authorization header' });
    }
    
    try {
      const token = authorization.replace('Bearer ', '');
      const decoded = await app.jwt.verify(token);
      const data = ChangePasswordRequestSchema.parse(request.body);
      
      // Validate new password strength
      const passwordValidation = validatePasswordStrength(data.newPassword);
      if (!passwordValidation.valid) {
        return reply.status(400).send({
          error: 'Invalid password',
          details: passwordValidation.errors
        });
      }
      
      // Get current password hash
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (userResult.rows.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      // Verify current password
      const isValidPassword = await verifyPassword(
        data.currentPassword,
        userResult.rows[0].password_hash
      );
      
      if (!isValidPassword) {
        return reply.status(401).send({ error: 'Invalid current password' });
      }
      
      // Hash new password
      const newPasswordHash = await hashPassword(data.newPassword);
      
      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, decoded.userId]
      );
      
      // Invalidate all sessions except current
      const sessions = await sessionManager.getUserSessions(decoded.userId);
      for (const session of sessions) {
        if (session.id !== decoded.sessionId) {
          await sessionManager.deleteSession(session.id);
        }
      }
      
      return reply.send({ message: 'Password changed successfully' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      throw error;
    }
  });
}