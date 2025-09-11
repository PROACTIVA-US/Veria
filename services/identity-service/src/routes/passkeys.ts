import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { webAuthnService } from '../auth/webauthn.js';
import { generateTokens } from '../auth/jwt.js';
import { sessionManager } from '../auth/session.js';
import { randomUUID } from 'crypto';

// Request schemas
const RegisterPasskeyStartSchema = z.object({
  name: z.string().optional()
});

const RegisterPasskeyCompleteSchema = z.object({
  response: z.any(), // RegistrationResponseJSON
  name: z.string().optional()
});

const AuthenticatePasskeyStartSchema = z.object({
  email: z.string().email().optional()
});

const AuthenticatePasskeyCompleteSchema = z.object({
  response: z.any(), // AuthenticationResponseJSON
  email: z.string().email().optional()
});

export async function passkeyRoutes(app: FastifyInstance) {
  const db = (app as any).db;
  
  // Start passkey registration (requires authentication)
  app.post('/auth/passkey/register/start',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const data = RegisterPasskeyStartSchema.parse(request.body);
        const user = request.user;
        
        // Get user details
        const userResult = await db.query(
          'SELECT email, first_name, last_name FROM users WHERE id = $1',
          [user.userId]
        );
        
        if (userResult.rows.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }
        
        const userData = userResult.rows[0];
        const userName = `${userData.first_name} ${userData.last_name}`.trim();
        
        // Get existing credentials
        const credentialsResult = await db.query(
          'SELECT * FROM passkey_credentials WHERE user_id = $1',
          [user.userId]
        );
        
        const existingCredentials = credentialsResult.rows.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          credentialId: row.credential_id,
          publicKey: row.public_key,
          counter: row.counter,
          transports: row.transports,
          backedUp: row.backed_up,
          name: row.name
        }));
        
        // Generate registration options
        const options = await webAuthnService.generateRegistrationOptions(
          user.userId,
          userData.email,
          userName,
          existingCredentials
        );
        
        return reply.send(options);
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
  
  // Complete passkey registration
  app.post('/auth/passkey/register/complete',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const data = RegisterPasskeyCompleteSchema.parse(request.body);
        const user = request.user;
        
        // Get challenge from response
        const challengeData = webAuthnService.getChallenge(data.response.challenge);
        if (!challengeData) {
          return reply.status(400).send({ error: 'Invalid or expired challenge' });
        }
        
        // Verify registration
        const verification = await webAuthnService.verifyRegistrationResponse(
          data.response,
          challengeData.challenge
        );
        
        if (!verification.verified || !verification.registrationInfo) {
          return reply.status(400).send({ error: 'Registration verification failed' });
        }
        
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
        
        // Store credential
        const credential = webAuthnService.formatCredentialForStorage(
          user.userId,
          credentialID,
          credentialPublicKey,
          counter,
          data.response.response.transports,
          data.name
        );
        
        const credentialId = randomUUID();
        await db.query(
          `INSERT INTO passkey_credentials (
            id, user_id, credential_id, public_key, counter,
            transports, backed_up, name, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            credentialId,
            credential.userId,
            credential.credentialId,
            credential.publicKey,
            credential.counter,
            credential.transports,
            credential.backedUp,
            credential.name
          ]
        );
        
        return reply.send({
          success: true,
          credentialId: credentialId,
          name: credential.name
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
  
  // Start passkey authentication
  app.post('/auth/passkey/login/start', async (request, reply) => {
    try {
      const data = AuthenticatePasskeyStartSchema.parse(request.body);
      
      let credentials = [];
      
      if (data.email) {
        // Get user by email
        const userResult = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [data.email]
        );
        
        if (userResult.rows.length > 0) {
          // Get user's credentials
          const credentialsResult = await db.query(
            'SELECT * FROM passkey_credentials WHERE user_id = $1',
            [userResult.rows[0].id]
          );
          
          credentials = credentialsResult.rows.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            credentialId: row.credential_id,
            publicKey: row.public_key,
            counter: row.counter,
            transports: row.transports,
            backedUp: row.backed_up,
            name: row.name
          }));
        }
      }
      
      // Generate authentication options
      const options = await webAuthnService.generateAuthenticationOptions(credentials);
      
      return reply.send(options);
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
  
  // Complete passkey authentication
  app.post('/auth/passkey/login/complete', async (request, reply) => {
    try {
      const data = AuthenticatePasskeyCompleteSchema.parse(request.body);
      
      // Get credential from database
      const credentialResult = await db.query(
        `SELECT pc.*, u.id as user_id, u.email, u.first_name, u.last_name,
                array_agg(r.name) as roles
         FROM passkey_credentials pc
         JOIN users u ON pc.user_id = u.id
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE pc.credential_id = $1
         GROUP BY pc.id, u.id`,
        [data.response.id]
      );
      
      if (credentialResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Credential not found' });
      }
      
      const credentialData = credentialResult.rows[0];
      const credential = {
        id: credentialData.id,
        userId: credentialData.user_id,
        credentialId: credentialData.credential_id,
        publicKey: credentialData.public_key,
        counter: credentialData.counter,
        transports: credentialData.transports,
        backedUp: credentialData.backed_up,
        name: credentialData.name,
        createdAt: credentialData.created_at,
        lastUsedAt: credentialData.last_used_at
      };
      
      // Get challenge
      const challengeData = webAuthnService.getChallenge(data.response.challenge);
      if (!challengeData) {
        return reply.status(400).send({ error: 'Invalid or expired challenge' });
      }
      
      // Verify authentication
      const verification = await webAuthnService.verifyAuthenticationResponse(
        data.response,
        challengeData.challenge,
        credential
      );
      
      if (!verification.verified || !verification.authenticationInfo) {
        return reply.status(400).send({ error: 'Authentication verification failed' });
      }
      
      const { newCounter } = verification.authenticationInfo;
      
      // Update credential counter and last used
      await db.query(
        'UPDATE passkey_credentials SET counter = $1, last_used_at = NOW() WHERE id = $2',
        [newCounter, credential.id]
      );
      
      // Update user last login
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [credentialData.user_id]
      );
      
      // Create session
      const session = await sessionManager.createSession({
        userId: credentialData.user_id,
        email: credentialData.email,
        roles: credentialData.roles || ['investor'],
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });
      
      // Generate tokens
      const tokens = generateTokens({
        userId: credentialData.user_id,
        email: credentialData.email,
        roles: credentialData.roles || ['investor'],
        sessionId: session.id
      }, app);
      
      return reply.send({
        user: {
          id: credentialData.user_id,
          email: credentialData.email,
          firstName: credentialData.first_name,
          lastName: credentialData.last_name,
          roles: credentialData.roles || ['investor']
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
  
  // List user's passkeys (requires authentication)
  app.get('/auth/passkeys',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      const user = request.user;
      
      const credentialsResult = await db.query(
        `SELECT id, name, created_at, last_used_at, backed_up
         FROM passkey_credentials 
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [user.userId]
      );
      
      return reply.send({
        passkeys: credentialsResult.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at,
          backedUp: row.backed_up
        }))
      });
    }
  );
  
  // Delete a passkey (requires authentication)
  app.delete('/auth/passkeys/:passkeyId',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      const { passkeyId } = request.params;
      const user = request.user;
      
      // Check if user owns this passkey
      const credentialResult = await db.query(
        'SELECT user_id FROM passkey_credentials WHERE id = $1',
        [passkeyId]
      );
      
      if (credentialResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Passkey not found' });
      }
      
      if (credentialResult.rows[0].user_id !== user.userId) {
        return reply.status(403).send({ error: 'Cannot delete another user\'s passkey' });
      }
      
      // Check if this is the last authentication method
      const authMethodsCount = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM passkey_credentials WHERE user_id = $1) as passkeys,
          (SELECT password_hash IS NOT NULL FROM users WHERE id = $1) as has_password`,
        [user.userId]
      );
      
      const { passkeys, has_password } = authMethodsCount.rows[0];
      
      if (parseInt(passkeys) === 1 && !has_password) {
        return reply.status(400).send({ 
          error: 'Cannot delete last authentication method. Set a password first.' 
        });
      }
      
      // Delete passkey
      await db.query(
        'DELETE FROM passkey_credentials WHERE id = $1',
        [passkeyId]
      );
      
      return reply.send({ message: 'Passkey deleted successfully' });
    }
  );
  
  // Update passkey name (requires authentication)
  app.put('/auth/passkeys/:passkeyId',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      const { passkeyId } = request.params;
      const { name } = request.body;
      const user = request.user;
      
      if (!name || typeof name !== 'string') {
        return reply.status(400).send({ error: 'Name is required' });
      }
      
      // Update passkey name
      const result = await db.query(
        'UPDATE passkey_credentials SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
        [name, passkeyId, user.userId]
      );
      
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Passkey not found' });
      }
      
      return reply.send({ message: 'Passkey name updated', name });
    }
  );
}