import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission, Permission } from '../auth/rbac.js';
// Mock KYC provider for Sprint 0
const kycProviderManager = {
  providers: new Map(),
  getProvider: () => ({
    initiateKYC: async (userId: string, level: string) => ({ 
      sessionId: `kyc-session-${Date.now()}`,
      status: 'pending',
      userId,
      level 
    }),
    uploadDocument: async () => ({ success: true }),
    getStatus: async () => ({ status: 'pending', details: {} }),
    performScreening: async () => ({ passed: true, details: {} })
  })
};

enum KYCLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  ENHANCED = 'enhanced'
}

enum KYCStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  FAILED = 'failed'
}
import { randomUUID } from 'crypto';

// Request schemas
const InitiateKYCSchema = z.object({
  userId: z.string().uuid(),
  level: z.nativeEnum(KYCLevel),
  provider: z.string().optional()
});

const UploadDocumentSchema = z.object({
  sessionId: z.string(),
  documentType: z.string(),
  documentData: z.string() // Base64 encoded
});

const CheckStatusSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().uuid().optional()
}).refine(data => data.sessionId || data.userId, {
  message: 'Either sessionId or userId must be provided'
});

const SanctionsScreeningSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional()
});

export async function kycRoutes(app: FastifyInstance) {
  const db = (app as any).db;
  
  // Initiate KYC verification
  app.post('/kyc/initiate',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const data = InitiateKYCSchema.parse(request.body);
        const user = request.user;
        
        // Check if user can initiate KYC for the target user
        if (user.userId !== data.userId && !user.roles.includes('admin')) {
          return reply.status(403).send({ error: 'Cannot initiate KYC for another user' });
        }
        
        // Get user details from database
        const userResult = await db.query(
          'SELECT email, first_name, last_name, date_of_birth, nationality FROM users WHERE id = $1',
          [data.userId]
        );
        
        if (userResult.rows.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }
        
        const userData = userResult.rows[0];
        
        // Initiate KYC with provider
        const session = await kycProviderManager.initiateVerification({
          userId: data.userId,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          dateOfBirth: userData.date_of_birth,
          nationality: userData.nationality,
          requiredLevel: data.level
        }, data.provider);
        
        // Store session in database
        await db.query(
          `INSERT INTO kyc_sessions (
            id, user_id, provider, session_id, status, 
            required_level, verification_url, expires_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            randomUUID(),
            data.userId,
            session.providerId,
            session.sessionId,
            session.status,
            data.level,
            session.verificationUrl,
            session.expiresAt
          ]
        );
        
        // Update user KYC status
        await db.query(
          'UPDATE users SET kyc_status = $1 WHERE id = $2',
          [KYCStatus.PENDING, data.userId]
        );
        
        return reply.send({
          sessionId: session.sessionId,
          status: session.status,
          verificationUrl: session.verificationUrl,
          expiresAt: session.expiresAt
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
  
  // Check KYC status
  app.get('/kyc/status',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const query = CheckStatusSchema.parse(request.query);
        const user = request.user;
        
        let sessionId: string;
        let userId: string;
        
        if (query.sessionId) {
          // Get session from database
          const sessionResult = await db.query(
            'SELECT * FROM kyc_sessions WHERE session_id = $1',
            [query.sessionId]
          );
          
          if (sessionResult.rows.length === 0) {
            return reply.status(404).send({ error: 'Session not found' });
          }
          
          sessionId = sessionResult.rows[0].session_id;
          userId = sessionResult.rows[0].user_id;
        } else {
          // Get latest session for user
          const sessionResult = await db.query(
            'SELECT * FROM kyc_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [query.userId!]
          );
          
          if (sessionResult.rows.length === 0) {
            return reply.status(404).send({ error: 'No KYC session found for user' });
          }
          
          sessionId = sessionResult.rows[0].session_id;
          userId = sessionResult.rows[0].user_id;
        }
        
        // Check if user can view this KYC status
        if (user.userId !== userId && !user.roles.includes('admin') && !user.roles.includes('compliance_officer')) {
          return reply.status(403).send({ error: 'Cannot view KYC status for another user' });
        }
        
        // Get status from provider
        const verification = await kycProviderManager.checkStatus(sessionId);
        
        // Update database
        await db.query(
          'UPDATE kyc_sessions SET status = $1, updated_at = NOW() WHERE session_id = $2',
          [verification.status, sessionId]
        );
        
        if (verification.status === KYCStatus.APPROVED) {
          await db.query(
            'UPDATE users SET kyc_status = $1, kyc_verified_at = NOW() WHERE id = $2',
            ['approved', userId]
          );
        } else if (verification.status === KYCStatus.REJECTED) {
          await db.query(
            'UPDATE users SET kyc_status = $1 WHERE id = $2',
            ['rejected', userId]
          );
        }
        
        return reply.send({
          sessionId,
          userId,
          status: verification.status,
          level: verification.level,
          riskScore: verification.riskScore,
          riskLevel: verification.riskLevel,
          checks: verification.checks,
          documents: verification.documents,
          rejectionReasons: verification.rejectionReasons,
          verifiedAt: verification.verifiedAt,
          expiresAt: verification.expiresAt
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
  
  // Upload KYC document
  app.post('/kyc/documents',
    { preHandler: app.authenticate },
    async (request: any, reply) => {
      try {
        const data = UploadDocumentSchema.parse(request.body);
        
        // Get session from database
        const sessionResult = await db.query(
          'SELECT user_id, provider FROM kyc_sessions WHERE session_id = $1',
          [data.sessionId]
        );
        
        if (sessionResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Session not found' });
        }
        
        const { user_id: userId, provider } = sessionResult.rows[0];
        
        // Check if user can upload documents for this session
        if (request.user.userId !== userId && !request.user.roles.includes('admin')) {
          return reply.status(403).send({ error: 'Cannot upload documents for another user' });
        }
        
        // Convert base64 to buffer
        const documentBuffer = Buffer.from(data.documentData, 'base64');
        
        // Upload to provider
        const kycProvider = kycProviderManager.getProvider(provider);
        const result = await kycProvider.uploadDocument(data.sessionId, {
          type: data.documentType as any,
          data: documentBuffer,
          mimeType: 'application/octet-stream',
          fileName: `${data.documentType}.pdf`
        });
        
        // Store document reference in database
        await db.query(
          `INSERT INTO kyc_documents (
            id, user_id, session_id, document_type, 
            document_id, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            randomUUID(),
            userId,
            data.sessionId,
            data.documentType,
            result.documentId,
            result.status
          ]
        );
        
        return reply.send({
          documentId: result.documentId,
          status: result.status,
          message: result.message
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
  
  // Sanctions screening
  app.post('/kyc/sanctions-screening',
    { preHandler: requirePermission([Permission.KYC_REVIEW, Permission.COMPLIANCE_REVIEW]) },
    async (request: any, reply) => {
      try {
        const data = SanctionsScreeningSchema.parse(request.body);
        
        // Perform sanctions screening
        const result = await kycProviderManager.screenSanctions({
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          nationality: data.nationality
        });
        
        // Store screening result in database
        await db.query(
          `INSERT INTO sanctions_screenings (
            id, user_id, screening_id, has_matches, 
            is_pep, has_adverse_media, risk_score, 
            matches, screened_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            randomUUID(),
            data.userId,
            result.id,
            result.matches.length > 0,
            result.isPEP,
            result.hasAdverseMedia,
            result.riskScore,
            JSON.stringify(result.matches)
          ]
        );
        
        return reply.send({
          screeningId: result.id,
          hasMatches: result.matches.length > 0,
          matchCount: result.matches.length,
          isPEP: result.isPEP,
          hasAdverseMedia: result.hasAdverseMedia,
          riskScore: result.riskScore,
          matches: result.matches
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
  
  // KYC webhook endpoint
  app.post('/kyc/webhook/:provider', async (request: any, reply) => {
    const { provider } = request.params;
    
    try {
      const result = await kycProviderManager.handleWebhook(provider, {
        headers: request.headers,
        body: request.body
      });
      
      // Process webhook result
      if (result.processed && result.action === 'verification_complete') {
        // Update user KYC status
        const webhookData = result.data;
        if (webhookData.userId) {
          await db.query(
            'UPDATE users SET kyc_status = $1, kyc_verified_at = NOW() WHERE id = $2',
            [webhookData.status === 'verified' ? 'approved' : 'rejected', webhookData.userId]
          );
        }
      }
      
      return reply.send({ received: true });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return reply.status(400).send({ error: 'Webhook processing failed' });
    }
  });
  
  // Get KYC providers
  app.get('/kyc/providers',
    { preHandler: requirePermission(Permission.KYC_REVIEW) },
    async (request, reply) => {
      const providers = kycProviderManager.getAvailableProviders();
      const primary = kycProviderManager.getPrimaryProvider();
      const fallback = kycProviderManager.getFallbackProvider();
      
      return reply.send({
        providers,
        primary,
        fallback
      });
    }
  );
}