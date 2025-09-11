import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Permission, requirePermission, Role, RoleAssignmentSchema } from '../auth/rbac.js';
import { randomUUID } from 'crypto';

// Request/Response schemas
const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  userType: z.enum(['investor', 'institution', 'issuer']).optional(),
  kycStatus: z.enum(['pending', 'in_review', 'approved', 'rejected']).optional()
});

const ListUsersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  organizationId: z.string().uuid().optional(),
  kycStatus: z.enum(['pending', 'in_review', 'approved', 'rejected']).optional(),
  userType: z.enum(['investor', 'institution', 'issuer']).optional(),
  search: z.string().optional()
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  userType: z.enum(['investor', 'institution', 'issuer']),
  organizationId: z.string().uuid().optional(),
  roles: z.array(z.enum(Object.values(Role) as [Role, ...Role[]])).optional()
});

export async function userRoutes(app: FastifyInstance) {
  const db = (app as any).db; // Assumes database is attached to app
  
  // List users
  app.get('/users', 
    { preHandler: requirePermission(Permission.USER_READ) },
    async (request, reply) => {
      try {
        const query = ListUsersQuerySchema.parse(request.query);
        
        let whereConditions = [];
        let params = [];
        let paramCount = 1;
        
        if (query.organizationId) {
          whereConditions.push(`u.organization_id = $${paramCount}`);
          params.push(query.organizationId);
          paramCount++;
        }
        
        if (query.kycStatus) {
          whereConditions.push(`u.kyc_status = $${paramCount}`);
          params.push(query.kycStatus);
          paramCount++;
        }
        
        if (query.userType) {
          whereConditions.push(`u.user_type = $${paramCount}`);
          params.push(query.userType);
          paramCount++;
        }
        
        if (query.search) {
          whereConditions.push(`(
            u.email ILIKE $${paramCount} OR 
            u.first_name ILIKE $${paramCount} OR 
            u.last_name ILIKE $${paramCount}
          )`);
          params.push(`%${query.search}%`);
          paramCount++;
        }
        
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : '';
        
        // Get total count
        const countResult = await db.query(
          `SELECT COUNT(*) FROM users u ${whereClause}`,
          params
        );
        
        // Get users with pagination
        params.push(query.limit);
        params.push(query.offset);
        
        const usersResult = await db.query(
          `SELECT u.id, u.email, u.first_name, u.last_name,
                  u.user_type, u.kyc_status, u.email_verified,
                  u.organization_id, u.created_at, u.last_login_at,
                  array_agg(r.name) as roles
           FROM users u
           LEFT JOIN user_roles ur ON u.id = ur.user_id
           LEFT JOIN roles r ON ur.role_id = r.id
           ${whereClause}
           GROUP BY u.id
           ORDER BY u.created_at DESC
           LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
          params
        );
        
        return reply.send({
          users: usersResult.rows.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type,
            kycStatus: user.kyc_status,
            emailVerified: user.email_verified,
            organizationId: user.organization_id,
            roles: user.roles || [],
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at
          })),
          total: parseInt(countResult.rows[0].count),
          limit: query.limit,
          offset: query.offset
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
    }
  );
  
  // Get user by ID
  app.get('/users/:userId',
    { preHandler: requirePermission(Permission.USER_READ) },
    async (request: any, reply) => {
      const { userId } = request.params;
      
      const userResult = await db.query(
        `SELECT u.id, u.email, u.first_name, u.last_name,
                u.user_type, u.kyc_status, u.email_verified,
                u.organization_id, u.created_at, u.last_login_at,
                u.failed_login_attempts, u.locked_until,
                array_agg(DISTINCT r.name) as roles,
                array_agg(DISTINCT jsonb_build_object(
                  'id', s.id,
                  'createdAt', s.created_at,
                  'lastAccessedAt', s.last_accessed_at,
                  'expiresAt', s.expires_at
                )) as sessions
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         LEFT JOIN sessions s ON u.id = s.user_id AND s.expires_at > NOW()
         WHERE u.id = $1
         GROUP BY u.id`,
        [userId]
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
        organizationId: user.organization_id,
        roles: user.roles || [],
        sessions: user.sessions.filter((s: any) => s.id !== null),
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        accountLocked: user.locked_until && new Date(user.locked_until) > new Date(),
        failedLoginAttempts: user.failed_login_attempts
      });
    }
  );
  
  // Create user (admin only)
  app.post('/users',
    { preHandler: requirePermission(Permission.USER_CREATE) },
    async (request, reply) => {
      try {
        const data = CreateUserSchema.parse(request.body);
        
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
        
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // Create user without password (will need to set via reset flow)
          const userId = randomUUID();
          const userResult = await client.query(
            `INSERT INTO users (
              id, email, first_name, last_name, user_type,
              organization_id, kyc_status, email_verified, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id, email, first_name, last_name`,
            [
              userId,
              data.email,
              data.firstName,
              data.lastName,
              data.userType,
              data.organizationId,
              'pending',
              false
            ]
          );
          
          // Assign roles
          const roles = data.roles || [Role.INVESTOR];
          for (const role of roles) {
            await client.query(
              `INSERT INTO user_roles (user_id, role_id, assigned_at)
               VALUES ($1, (SELECT id FROM roles WHERE name = $2), NOW())`,
              [userId, role]
            );
          }
          
          await client.query('COMMIT');
          
          return reply.status(201).send({
            id: userResult.rows[0].id,
            email: userResult.rows[0].email,
            firstName: userResult.rows[0].first_name,
            lastName: userResult.rows[0].last_name,
            roles: roles,
            message: 'User created successfully. Password reset email will be sent.'
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
    }
  );
  
  // Update user
  app.put('/users/:userId',
    { preHandler: requirePermission(Permission.USER_UPDATE) },
    async (request: any, reply) => {
      try {
        const { userId } = request.params;
        const data = UpdateUserSchema.parse(request.body);
        
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramCount = 1;
        
        if (data.firstName !== undefined) {
          updates.push(`first_name = $${paramCount}`);
          params.push(data.firstName);
          paramCount++;
        }
        
        if (data.lastName !== undefined) {
          updates.push(`last_name = $${paramCount}`);
          params.push(data.lastName);
          paramCount++;
        }
        
        if (data.email !== undefined) {
          // Check if new email is already taken
          const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [data.email, userId]
          );
          
          if (existingUser.rows.length > 0) {
            return reply.status(409).send({
              error: 'Email already in use'
            });
          }
          
          updates.push(`email = $${paramCount}`);
          params.push(data.email);
          paramCount++;
        }
        
        if (data.userType !== undefined) {
          updates.push(`user_type = $${paramCount}`);
          params.push(data.userType);
          paramCount++;
        }
        
        if (data.kycStatus !== undefined) {
          updates.push(`kyc_status = $${paramCount}`);
          params.push(data.kycStatus);
          paramCount++;
        }
        
        if (updates.length === 0) {
          return reply.status(400).send({
            error: 'No fields to update'
          });
        }
        
        params.push(userId);
        
        const result = await db.query(
          `UPDATE users 
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${paramCount}
           RETURNING id, email, first_name, last_name, user_type, kyc_status`,
          params
        );
        
        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }
        
        const user = result.rows[0];
        
        return reply.send({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          kycStatus: user.kyc_status
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
    }
  );
  
  // Delete user
  app.delete('/users/:userId',
    { preHandler: requirePermission(Permission.USER_DELETE) },
    async (request: any, reply) => {
      const { userId } = request.params;
      
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete user sessions
        await sessionManager.deleteUserSessions(userId);
        
        // Delete user roles
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        
        // Delete user
        const result = await client.query(
          'DELETE FROM users WHERE id = $1 RETURNING id',
          [userId]
        );
        
        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return reply.status(404).send({ error: 'User not found' });
        }
        
        await client.query('COMMIT');
        
        return reply.send({ message: 'User deleted successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  );
  
  // Get user sessions
  app.get('/users/:userId/sessions',
    { preHandler: requirePermission([Permission.USER_READ, Permission.SYSTEM_MONITOR]) },
    async (request: any, reply) => {
      const { userId } = request.params;
      
      const sessions = await sessionManager.getUserSessions(userId);
      
      return reply.send({
        sessions: sessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt,
          lastAccessedAt: s.lastAccessedAt,
          expiresAt: s.expiresAt,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent
        }))
      });
    }
  );
  
  // Assign roles to user
  app.post('/users/:userId/roles',
    { preHandler: requirePermission(Permission.USER_UPDATE) },
    async (request: any, reply) => {
      try {
        const { userId } = request.params;
        const data = RoleAssignmentSchema.parse({ userId, ...request.body });
        
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // Remove existing roles
          await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
          
          // Assign new roles
          for (const role of data.roles) {
            await client.query(
              `INSERT INTO user_roles (user_id, role_id, assigned_at)
               VALUES ($1, (SELECT id FROM roles WHERE name = $2), NOW())`,
              [userId, role]
            );
          }
          
          await client.query('COMMIT');
          
          // Invalidate user sessions to force re-authentication
          await sessionManager.deleteUserSessions(userId);
          
          return reply.send({
            message: 'Roles updated successfully',
            roles: data.roles
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
    }
  );
}