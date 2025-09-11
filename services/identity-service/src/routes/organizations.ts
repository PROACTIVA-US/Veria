import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission, Permission } from '../auth/rbac.js';
import { randomUUID } from 'crypto';

// Request/Response schemas
const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['corporation', 'partnership', 'llc', 'trust', 'other']),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  country: z.string().length(2), // ISO country code
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string(),
    country: z.string().length(2)
  }),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

const UpdateOrganizationSchema = CreateOrganizationSchema.partial();

const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer'])
});

const UpdateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer'])
});

const ListOrganizationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['corporation', 'partnership', 'llc', 'trust', 'other']).optional(),
  search: z.string().optional()
});

export async function organizationRoutes(app: FastifyInstance) {
  const db = (app as any).db;
  
  // Create organization
  app.post('/organizations',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const data = CreateOrganizationSchema.parse(request.body);
        const user = request.user;
        
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // Create organization
          const orgId = randomUUID();
          const orgResult = await client.query(
            `INSERT INTO organizations (
              id, name, type, registration_number, tax_id,
              country, address, contact_email, contact_phone,
              website, metadata, created_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
            RETURNING *`,
            [
              orgId,
              data.name,
              data.type,
              data.registrationNumber,
              data.taxId,
              data.country,
              JSON.stringify(data.address),
              data.contactEmail,
              data.contactPhone,
              data.website,
              data.metadata || {},
              user.userId
            ]
          );
          
          // Add creator as owner
          await client.query(
            `INSERT INTO organization_members (
              organization_id, user_id, role, invited_by, joined_at
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [orgId, user.userId, 'owner', user.userId]
          );
          
          await client.query('COMMIT');
          
          const org = orgResult.rows[0];
          return reply.status(201).send({
            id: org.id,
            name: org.name,
            type: org.type,
            registrationNumber: org.registration_number,
            taxId: org.tax_id,
            country: org.country,
            address: org.address,
            contactEmail: org.contact_email,
            contactPhone: org.contact_phone,
            website: org.website,
            metadata: org.metadata,
            createdAt: org.created_at
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
  
  // Get organization by ID
  app.get('/organizations/:orgId',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      const { orgId } = request.params;
      const user = request.user;
      
      // Check if user is a member of the organization
      const memberCheck = await db.query(
        'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [orgId, user.userId]
      );
      
      if (memberCheck.rows.length === 0 && !user.roles.includes('admin')) {
        return reply.status(403).send({ error: 'Not a member of this organization' });
      }
      
      const orgResult = await db.query(
        `SELECT o.*, 
                COUNT(DISTINCT om.user_id) as member_count,
                array_agg(DISTINCT jsonb_build_object(
                  'userId', u.id,
                  'email', u.email,
                  'firstName', u.first_name,
                  'lastName', u.last_name,
                  'role', om.role
                )) FILTER (WHERE om.role = 'owner') as owners
         FROM organizations o
         LEFT JOIN organization_members om ON o.id = om.organization_id
         LEFT JOIN users u ON om.user_id = u.id
         WHERE o.id = $1
         GROUP BY o.id`,
        [orgId]
      );
      
      if (orgResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Organization not found' });
      }
      
      const org = orgResult.rows[0];
      
      return reply.send({
        id: org.id,
        name: org.name,
        type: org.type,
        registrationNumber: org.registration_number,
        taxId: org.tax_id,
        country: org.country,
        address: org.address,
        contactEmail: org.contact_email,
        contactPhone: org.contact_phone,
        website: org.website,
        metadata: org.metadata,
        memberCount: parseInt(org.member_count),
        owners: org.owners.filter((o: any) => o.userId !== null),
        createdAt: org.created_at,
        userRole: memberCheck.rows[0]?.role
      });
    }
  );
  
  // Update organization
  app.put('/organizations/:orgId',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const { orgId } = request.params;
        const data = UpdateOrganizationSchema.parse(request.body);
        const user = request.user;
        
        // Check if user is owner or admin of the organization
        const memberCheck = await db.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [orgId, user.userId]
        );
        
        if (memberCheck.rows.length === 0 || 
            !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
          return reply.status(403).send({ 
            error: 'Must be owner or admin to update organization' 
          });
        }
        
        // Build update query
        const updates = [];
        const params = [];
        let paramCount = 1;
        
        if (data.name !== undefined) {
          updates.push(`name = $${paramCount}`);
          params.push(data.name);
          paramCount++;
        }
        
        if (data.type !== undefined) {
          updates.push(`type = $${paramCount}`);
          params.push(data.type);
          paramCount++;
        }
        
        if (data.registrationNumber !== undefined) {
          updates.push(`registration_number = $${paramCount}`);
          params.push(data.registrationNumber);
          paramCount++;
        }
        
        if (data.taxId !== undefined) {
          updates.push(`tax_id = $${paramCount}`);
          params.push(data.taxId);
          paramCount++;
        }
        
        if (data.address !== undefined) {
          updates.push(`address = $${paramCount}`);
          params.push(JSON.stringify(data.address));
          paramCount++;
        }
        
        if (data.contactEmail !== undefined) {
          updates.push(`contact_email = $${paramCount}`);
          params.push(data.contactEmail);
          paramCount++;
        }
        
        if (data.contactPhone !== undefined) {
          updates.push(`contact_phone = $${paramCount}`);
          params.push(data.contactPhone);
          paramCount++;
        }
        
        if (data.website !== undefined) {
          updates.push(`website = $${paramCount}`);
          params.push(data.website);
          paramCount++;
        }
        
        if (data.metadata !== undefined) {
          updates.push(`metadata = $${paramCount}`);
          params.push(data.metadata);
          paramCount++;
        }
        
        if (updates.length === 0) {
          return reply.status(400).send({ error: 'No fields to update' });
        }
        
        params.push(orgId);
        
        const result = await db.query(
          `UPDATE organizations 
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${paramCount}
           RETURNING *`,
          params
        );
        
        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Organization not found' });
        }
        
        const org = result.rows[0];
        
        return reply.send({
          id: org.id,
          name: org.name,
          type: org.type,
          registrationNumber: org.registration_number,
          taxId: org.tax_id,
          country: org.country,
          address: org.address,
          contactEmail: org.contact_email,
          contactPhone: org.contact_phone,
          website: org.website,
          metadata: org.metadata,
          updatedAt: org.updated_at
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
  
  // List organizations
  app.get('/organizations',
    { preHandler: requirePermission(Permission.ORG_READ) },
    async (request: any, reply) => {
      try {
        const query = ListOrganizationsQuerySchema.parse(request.query);
        const user = request.user;
        
        let whereConditions = [];
        let params = [];
        let paramCount = 1;
        
        // If not admin, only show organizations user is member of
        if (!user.roles.includes('admin')) {
          whereConditions.push(`o.id IN (
            SELECT organization_id FROM organization_members WHERE user_id = $${paramCount}
          )`);
          params.push(user.userId);
          paramCount++;
        }
        
        if (query.type) {
          whereConditions.push(`o.type = $${paramCount}`);
          params.push(query.type);
          paramCount++;
        }
        
        if (query.search) {
          whereConditions.push(`(
            o.name ILIKE $${paramCount} OR 
            o.contact_email ILIKE $${paramCount}
          )`);
          params.push(`%${query.search}%`);
          paramCount++;
        }
        
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : '';
        
        // Get total count
        const countResult = await db.query(
          `SELECT COUNT(*) FROM organizations o ${whereClause}`,
          params
        );
        
        // Get organizations with pagination
        params.push(query.limit);
        params.push(query.offset);
        
        const orgsResult = await db.query(
          `SELECT o.*, 
                  COUNT(DISTINCT om.user_id) as member_count
           FROM organizations o
           LEFT JOIN organization_members om ON o.id = om.organization_id
           ${whereClause}
           GROUP BY o.id
           ORDER BY o.created_at DESC
           LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
          params
        );
        
        return reply.send({
          organizations: orgsResult.rows.map(org => ({
            id: org.id,
            name: org.name,
            type: org.type,
            country: org.country,
            contactEmail: org.contact_email,
            memberCount: parseInt(org.member_count),
            createdAt: org.created_at
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
  
  // Add member to organization
  app.post('/organizations/:orgId/members',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const { orgId } = request.params;
        const data = AddMemberSchema.parse(request.body);
        const user = request.user;
        
        // Check if user is owner or admin of the organization
        const memberCheck = await db.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [orgId, user.userId]
        );
        
        if (memberCheck.rows.length === 0 || 
            !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
          return reply.status(403).send({ 
            error: 'Must be owner or admin to add members' 
          });
        }
        
        // Check if user to be added exists
        const userExists = await db.query(
          'SELECT id FROM users WHERE id = $1',
          [data.userId]
        );
        
        if (userExists.rows.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }
        
        // Check if user is already a member
        const existingMember = await db.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [orgId, data.userId]
        );
        
        if (existingMember.rows.length > 0) {
          return reply.status(409).send({ 
            error: 'User is already a member',
            currentRole: existingMember.rows[0].role
          });
        }
        
        // Add member
        await db.query(
          `INSERT INTO organization_members (
            organization_id, user_id, role, invited_by, joined_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [orgId, data.userId, data.role, user.userId]
        );
        
        return reply.status(201).send({
          message: 'Member added successfully',
          userId: data.userId,
          role: data.role
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
  
  // Update member role
  app.put('/organizations/:orgId/members/:userId',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const { orgId, userId: targetUserId } = request.params;
        const data = UpdateMemberRoleSchema.parse(request.body);
        const user = request.user;
        
        // Check if user is owner of the organization
        const memberCheck = await db.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [orgId, user.userId]
        );
        
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'owner') {
          return reply.status(403).send({ 
            error: 'Must be owner to update member roles' 
          });
        }
        
        // Cannot change own role if last owner
        if (user.userId === targetUserId && data.role !== 'owner') {
          const ownerCount = await db.query(
            'SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND role = $2',
            [orgId, 'owner']
          );
          
          if (parseInt(ownerCount.rows[0].count) === 1) {
            return reply.status(400).send({ 
              error: 'Cannot remove last owner from organization' 
            });
          }
        }
        
        // Update member role
        const result = await db.query(
          `UPDATE organization_members 
           SET role = $1 
           WHERE organization_id = $2 AND user_id = $3
           RETURNING *`,
          [data.role, orgId, targetUserId]
        );
        
        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Member not found' });
        }
        
        return reply.send({
          message: 'Member role updated',
          userId: targetUserId,
          role: data.role
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
  
  // Remove member from organization
  app.delete('/organizations/:orgId/members/:userId',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      const { orgId, userId: targetUserId } = request.params;
      const user = request.user;
      
      // Check if user is owner or admin of the organization
      const memberCheck = await db.query(
        'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [orgId, user.userId]
      );
      
      if (memberCheck.rows.length === 0 || 
          !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
        return reply.status(403).send({ 
          error: 'Must be owner or admin to remove members' 
        });
      }
      
      // Cannot remove last owner
      const targetMember = await db.query(
        'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [orgId, targetUserId]
      );
      
      if (targetMember.rows.length > 0 && targetMember.rows[0].role === 'owner') {
        const ownerCount = await db.query(
          'SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND role = $2',
          [orgId, 'owner']
        );
        
        if (parseInt(ownerCount.rows[0].count) === 1) {
          return reply.status(400).send({ 
            error: 'Cannot remove last owner from organization' 
          });
        }
      }
      
      // Remove member
      const result = await db.query(
        'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 RETURNING *',
        [orgId, targetUserId]
      );
      
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Member not found' });
      }
      
      return reply.send({ message: 'Member removed successfully' });
    }
  );
  
  // Get organization members
  app.get('/organizations/:orgId/members',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      const { orgId } = request.params;
      const user = request.user;
      
      // Check if user is a member of the organization
      const memberCheck = await db.query(
        'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [orgId, user.userId]
      );
      
      if (memberCheck.rows.length === 0 && !user.roles.includes('admin')) {
        return reply.status(403).send({ error: 'Not a member of this organization' });
      }
      
      const membersResult = await db.query(
        `SELECT u.id, u.email, u.first_name, u.last_name,
                u.kyc_status, om.role, om.joined_at,
                inv.email as invited_by_email
         FROM organization_members om
         JOIN users u ON om.user_id = u.id
         LEFT JOIN users inv ON om.invited_by = inv.id
         WHERE om.organization_id = $1
         ORDER BY om.joined_at DESC`,
        [orgId]
      );
      
      return reply.send({
        members: membersResult.rows.map(member => ({
          userId: member.id,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
          kycStatus: member.kyc_status,
          role: member.role,
          joinedAt: member.joined_at,
          invitedBy: member.invited_by_email
        }))
      });
    }
  );
}