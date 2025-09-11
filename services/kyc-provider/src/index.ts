import Fastify from 'fastify';
import { z } from 'zod';
import axios from 'axios';
import { createPostgresPool, createRedisClient } from '@veria/database';
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

// Database connections
const pgPool: Pool = createPostgresPool();
const redis: Redis = createRedisClient();

// KYC Request Schema
const KycRequestSchema = z.object({
  user_id: z.string(),
  full_name: z.string(),
  date_of_birth: z.string(),
  ssn_last4: z.string().regex(/^\d{4}$/).optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string()
  }),
  documents: z.array(z.object({
    type: z.enum(['passport', 'drivers_license', 'national_id']),
    number: z.string(),
    country: z.string()
  })).optional()
});

// KYC Providers
interface KycProvider {
  name: string;
  verify(data: any): Promise<KycResult>;
  checkSanctions(name: string): Promise<SanctionsResult>;
  getAmlScore(data: any): Promise<AmlResult>;
}

interface KycResult {
  verified: boolean;
  verificationId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  requiredActions: string[];
}

interface SanctionsResult {
  clear: boolean;
  matches: Array<{
    list: string;
    score: number;
    entity: string;
  }>;
}

interface AmlResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  indicators: string[];
}

// Chainalysis Provider (Mock)
class ChainalysisProvider implements KycProvider {
  name = 'Chainalysis';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.CHAINALYSIS_API_KEY || 'mock_key';
    this.baseUrl = process.env.CHAINALYSIS_URL || 'https://api.chainalysis.com';
  }

  async verify(data: any): Promise<KycResult> {
    // In production, this would call the actual Chainalysis API
    // For now, return mock data based on input
    
    const riskFactors = [];
    let riskScore = Math.floor(Math.random() * 30); // Base score 0-30
    
    // Check age
    const dob = new Date(data.date_of_birth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (age < 18) {
      riskScore = 100;
      riskFactors.push('UNDERAGE');
    } else if (age < 21) {
      riskScore += 10;
      riskFactors.push('YOUNG_ADULT');
    }
    
    // Check high-risk countries
    const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Cuba'];
    if (highRiskCountries.includes(data.address.country)) {
      riskScore += 50;
      riskFactors.push('HIGH_RISK_JURISDICTION');
    }
    
    // Determine risk level
    let riskLevel: KycResult['riskLevel'];
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';
    
    // Determine verification status
    const verified = riskScore < 70 && age >= 18;
    
    // Required actions
    const requiredActions = [];
    if (!verified) {
      if (age < 18) requiredActions.push('AGE_VERIFICATION_FAILED');
      if (riskScore >= 70) requiredActions.push('MANUAL_REVIEW_REQUIRED');
      if (!data.documents || data.documents.length === 0) {
        requiredActions.push('DOCUMENT_UPLOAD_REQUIRED');
      }
    }
    
    return {
      verified,
      verificationId: `CHA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      riskScore,
      riskLevel,
      flags: riskFactors,
      requiredActions
    };
  }

  async checkSanctions(name: string): Promise<SanctionsResult> {
    // Mock sanctions check
    const sanctionedNames = ['John Doe', 'Jane Smith']; // Mock sanctioned entities
    
    const matches = [];
    for (const sanctioned of sanctionedNames) {
      const similarity = this.calculateSimilarity(name.toLowerCase(), sanctioned.toLowerCase());
      if (similarity > 0.7) {
        matches.push({
          list: 'OFAC',
          score: similarity,
          entity: sanctioned
        });
      }
    }
    
    return {
      clear: matches.length === 0,
      matches
    };
  }

  async getAmlScore(data: any): Promise<AmlResult> {
    // Mock AML scoring
    const indicators = [];
    let score = Math.floor(Math.random() * 30);
    
    // Check for PEP (Politically Exposed Person)
    if (Math.random() < 0.1) {
      score += 30;
      indicators.push('PEP_MATCH');
    }
    
    // Check transaction patterns (would be based on actual transaction history)
    if (Math.random() < 0.05) {
      score += 20;
      indicators.push('UNUSUAL_TRANSACTION_PATTERN');
    }
    
    // Determine level
    let level: AmlResult['level'];
    if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';
    else level = 'low';
    
    return { score, level, indicators };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// TRM Labs Provider (Mock)
class TrmLabsProvider implements KycProvider {
  name = 'TRM Labs';

  async verify(data: any): Promise<KycResult> {
    // Similar to Chainalysis but with different scoring algorithm
    const riskScore = Math.floor(Math.random() * 40) + 10;
    
    return {
      verified: riskScore < 60,
      verificationId: `TRM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      riskScore,
      riskLevel: riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high',
      flags: [],
      requiredActions: []
    };
  }

  async checkSanctions(name: string): Promise<SanctionsResult> {
    return { clear: true, matches: [] };
  }

  async getAmlScore(data: any): Promise<AmlResult> {
    const score = Math.floor(Math.random() * 50);
    return {
      score,
      level: score < 25 ? 'low' : score < 50 ? 'medium' : 'high',
      indicators: []
    };
  }
}

// Provider factory
const providers: Map<string, KycProvider> = new Map([
  ['chainalysis', new ChainalysisProvider()],
  ['trm', new TrmLabsProvider()]
]);

// Routes

app.get('/health', async () => ({
  status: 'ok',
  name: 'kyc-provider',
  providers: Array.from(providers.keys()),
  timestamp: new Date().toISOString()
}));

// Main KYC verification endpoint (called by Tool Masker)
app.post('/api/v2/kyc', async (request, reply) => {
  try {
    const data = KycRequestSchema.parse(request.body);
    
    // Check cache
    const cacheKey = `kyc:${data.user_id}:${JSON.stringify(data)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Select provider (round-robin or based on config)
    const providerName = process.env.KYC_PROVIDER || 'chainalysis';
    const provider = providers.get(providerName) || providers.get('chainalysis')!;
    
    // Perform verification
    const [kycResult, sanctionsResult, amlResult] = await Promise.all([
      provider.verify(data),
      provider.checkSanctions(data.full_name),
      provider.getAmlScore(data)
    ]);
    
    // Combine results
    const finalResult = {
      status: kycResult.verified ? 'VERIFIED' : 'FAILED',
      verificationId: kycResult.verificationId,
      riskScore: Math.max(kycResult.riskScore, amlResult.score),
      riskLevel: this.determineOverallRiskLevel(kycResult.riskLevel, amlResult.level),
      flags: [...kycResult.flags, ...amlResult.indicators],
      requiredActions: kycResult.requiredActions,
      sanctions: sanctionsResult,
      aml: amlResult,
      provider: provider.name,
      timestamp: new Date().toISOString()
    };
    
    // Store in database
    await this.storeVerification(data.user_id, finalResult);
    
    // Cache result
    await redis.setex(cacheKey, 3600, JSON.stringify(finalResult));
    
    // Log for audit
    app.log.info({
      userId: data.user_id,
      verificationId: finalResult.verificationId,
      status: finalResult.status,
      provider: provider.name
    }, 'KYC verification completed');
    
    return finalResult;
  } catch (error) {
    app.log.error(error, 'KYC verification failed');
    return reply.status(400).send({
      error: 'KYC verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get verification status
app.get('/api/v2/kyc/:userId', async (request: any, reply) => {
  const { userId } = request.params;
  
  try {
    const result = await pgPool.query(
      'SELECT * FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'No verification found for user'
      });
    }
    
    return result.rows[0];
  } catch (error) {
    app.log.error(error, 'Failed to fetch verification status');
    return reply.status(500).send({
      error: 'Failed to fetch verification status'
    });
  }
});

// Webhook for document uploads
app.post('/api/v2/kyc/:userId/documents', async (request: any, reply) => {
  const { userId } = request.params;
  const { documents } = request.body;
  
  // Process document uploads
  // In production, this would handle actual document verification
  
  return {
    success: true,
    message: 'Documents received for processing',
    userId,
    documentCount: documents?.length || 0
  };
});

// Helper functions
function determineOverallRiskLevel(
  kycLevel: KycResult['riskLevel'],
  amlLevel: AmlResult['level']
): KycResult['riskLevel'] {
  const levels = { low: 0, medium: 1, high: 2, critical: 3 };
  const kycScore = levels[kycLevel] || 0;
  const amlScore = levels[amlLevel as keyof typeof levels] || 0;
  const maxScore = Math.max(kycScore, amlScore);
  
  const levelNames = Object.keys(levels) as Array<keyof typeof levels>;
  return levelNames[maxScore] as KycResult['riskLevel'];
}

async function storeVerification(userId: string, result: any) {
  try {
    await pgPool.query(
      `INSERT INTO kyc_verifications 
       (user_id, verification_id, status, risk_score, risk_level, provider, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        userId,
        result.verificationId,
        result.status,
        result.riskScore,
        result.riskLevel,
        result.provider,
        JSON.stringify(result)
      ]
    );
  } catch (error) {
    app.log.error(error, 'Failed to store verification');
  }
}

// Start server
const start = async () => {
  try {
    await pgPool.query('SELECT 1');
    await redis.ping();
    app.log.info('Database connections established');
    
    const port = parseInt(process.env.PORT || '3007', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`KYC Provider service listening on ${host}:${port}`);
    app.log.info(`Available providers: ${Array.from(providers.keys()).join(', ')}`);
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
  redis.disconnect();
  process.exit(0);
});

// Add these methods to the app context for use in route handlers
app.decorate('determineOverallRiskLevel', determineOverallRiskLevel);
app.decorate('storeVerification', storeVerification);

start();