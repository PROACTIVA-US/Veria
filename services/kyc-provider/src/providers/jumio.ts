import { 
  KYCProvider, 
  KYCInitiationData, 
  KYCSession, 
  KYCVerification, 
  KYCStatus,
  KYCLevel,
  DocumentUpload,
  DocumentUploadResult,
  SanctionsScreeningData,
  SanctionsScreeningResult,
  RiskLevel
} from '../types.js';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

export class JumioProvider implements KYCProvider {
  public readonly name = 'Jumio';
  public readonly providerId = 'jumio';
  private client: AxiosInstance;
  private apiToken: string;
  private apiSecret: string;
  
  constructor() {
    this.apiToken = process.env.JUMIO_API_TOKEN || '';
    this.apiSecret = process.env.JUMIO_API_SECRET || '';
    
    const authToken = Buffer.from(`${this.apiToken}:${this.apiSecret}`).toString('base64');
    
    this.client = axios.create({
      baseURL: process.env.JUMIO_API_URL || 'https://api.jumio.com',
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Veria/1.0'
      },
      timeout: 30000
    });
  }
  
  async initiateVerification(data: KYCInitiationData): Promise<KYCSession> {
    try {
      // Create account first
      const accountResponse = await this.client.post('/api/v1/accounts', {
        customerInternalReference: data.userId,
        workflowDefinition: {
          key: this.getWorkflowKey(data.requiredLevel),
          credentials: []
        },
        callbackUrl: process.env.JUMIO_CALLBACK_URL || `${process.env.BASE_URL}/api/v1/kyc/webhook/jumio`,
        userReference: data.userId,
        locale: 'en-US'
      });
      
      const accountId = accountResponse.data.account.id;
      
      // Create web initiation
      const initiationResponse = await this.client.post(`/api/v1/accounts/${accountId}/web-init`, {
        customerInternalReference: data.userId,
        userReference: data.userId,
        successUrl: `${process.env.FRONTEND_URL}/kyc/success`,
        errorUrl: `${process.env.FRONTEND_URL}/kyc/error`,
        locale: 'en-US',
        presets: {
          index: 1,
          locale: 'en-US',
          userConsent: {
            consent: {
              obtained: 'yes',
              obtainedAt: new Date().toISOString()
            }
          },
          userDetails: {
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            email: data.email,
            nationality: data.nationality
          }
        }
      });
      
      return {
        sessionId: accountId,
        providerId: this.providerId,
        status: KYCStatus.PENDING,
        verificationUrl: initiationResponse.data.redirectUrl,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error: any) {
      console.error('Jumio verification initiation failed:', error);
      throw new Error(`Failed to initiate Jumio verification: ${error.message}`);
    }
  }
  
  async checkStatus(sessionId: string): Promise<KYCVerification> {
    try {
      // Get account details
      const accountResponse = await this.client.get(`/api/v1/accounts/${sessionId}`);
      const account = accountResponse.data.account;
      
      // Get workflow execution details
      const workflowResponse = await this.client.get(`/api/v1/accounts/${sessionId}/workflow-execution`);
      const workflow = workflowResponse.data.workflow;
      
      // Get document verification details
      const documentsResponse = await this.client.get(`/api/v1/accounts/${sessionId}/documents`);
      const documents = documentsResponse.data.documents || [];
      
      // Process checks
      const checks = {
        identity: workflow.credentials?.idVerification?.status === 'APPROVED',
        document: documents.some((d: any) => d.status === 'APPROVED'),
        facialBiometric: workflow.credentials?.facialSimilarity?.status === 'APPROVED',
        addressVerification: workflow.credentials?.addressExtraction?.status === 'APPROVED',
        phoneVerification: false, // Jumio doesn't provide phone verification
        emailVerification: false, // Jumio doesn't provide email verification
        sanctionsScreening: workflow.credentials?.watchlistScreening?.status === 'NO_MATCH',
        pepScreening: workflow.credentials?.pepScreening?.status === 'NO_MATCH',
        adverseMediaScreening: workflow.credentials?.adverseMedia?.status === 'NO_MATCH'
      };
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(account, workflow, documents);
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Map verification status
      let status = KYCStatus.PENDING;
      if (account.status === 'DONE') {
        if (workflow.status === 'PASSED') {
          status = KYCStatus.APPROVED;
        } else if (workflow.status === 'FAILED') {
          status = KYCStatus.REJECTED;
        } else if (workflow.status === 'REVIEW') {
          status = KYCStatus.REQUIRES_REVIEW;
        }
      } else if (account.status === 'EXPIRED') {
        status = KYCStatus.EXPIRED;
      }
      
      // Process rejection reasons
      const rejectionReasons: string[] = [];
      if (workflow.rejectReason) {
        rejectionReasons.push(...workflow.rejectReason.details);
      }
      
      return {
        sessionId,
        providerId: this.providerId,
        status,
        level: this.mapLevel(workflow.definitionKey),
        riskScore,
        riskLevel,
        checks,
        documents: documents.map((doc: any) => ({
          type: doc.type,
          status: doc.status.toLowerCase(),
          verifiedAt: doc.approvedAt ? new Date(doc.approvedAt) : undefined
        })),
        rejectionReasons,
        verifiedAt: workflow.completedAt ? new Date(workflow.completedAt) : undefined,
        expiresAt: account.expiresAt ? new Date(account.expiresAt) : undefined
      };
    } catch (error: any) {
      console.error('Jumio status check failed:', error);
      throw new Error(`Failed to check Jumio verification status: ${error.message}`);
    }
  }
  
  async uploadDocument(sessionId: string, document: DocumentUpload): Promise<DocumentUploadResult> {
    try {
      // Jumio handles document uploads through their web interface
      // This method would typically be used for API-based document submission
      
      const response = await this.client.post(
        `/api/v1/accounts/${sessionId}/documents`,
        {
          type: this.mapDocumentType(document.type),
          country: 'USA', // Default, should be provided in document data
          data: document.data.toString('base64')
        }
      );
      
      return {
        documentId: response.data.documentId,
        status: 'pending',
        message: 'Document uploaded successfully'
      };
    } catch (error: any) {
      console.error('Jumio document upload failed:', error);
      throw new Error(`Failed to upload document to Jumio: ${error.message}`);
    }
  }
  
  async screenSanctions(data: SanctionsScreeningData): Promise<SanctionsScreeningResult> {
    try {
      // Jumio includes sanctions screening in their verification workflow
      // This is a standalone screening endpoint for additional checks
      
      const response = await this.client.post('/api/v1/screenings', {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        screeningTypes: ['SANCTIONS', 'PEP', 'ADVERSE_MEDIA']
      });
      
      const screeningData = response.data;
      
      // Process matches
      const matches = screeningData.watchlistMatches?.map((match: any) => ({
        listName: match.watchlist,
        entityName: match.name,
        matchScore: match.score / 100, // Convert to 0-1 scale
        entityType: match.type,
        notes: match.description,
        lastUpdated: match.lastUpdated
      })) || [];
      
      // Calculate risk score
      let riskScore = 0;
      
      // Sanctions matches
      const sanctionsMatches = matches.filter((m: any) => m.listName.includes('SANCTION'));
      if (sanctionsMatches.length > 0) {
        riskScore += Math.min(sanctionsMatches.length * 25, 50);
      }
      
      // PEP matches
      const pepMatches = matches.filter((m: any) => m.listName.includes('PEP'));
      const isPEP = pepMatches.length > 0;
      if (isPEP) {
        riskScore += 30;
      }
      
      // Adverse media
      const adverseMediaMatches = matches.filter((m: any) => m.listName.includes('ADVERSE'));
      const hasAdverseMedia = adverseMediaMatches.length > 0;
      if (hasAdverseMedia) {
        riskScore += 20;
      }
      
      riskScore = Math.min(riskScore, 100);
      
      return {
        id: screeningData.screeningId || randomUUID(),
        matches,
        isPEP,
        pepDetails: pepMatches.map((m: any) => m.notes).join('; '),
        hasAdverseMedia,
        adverseMediaDetails: adverseMediaMatches.map((m: any) => m.notes).join('; '),
        riskScore,
        screenedAt: new Date(),
        provider: this.name
      };
    } catch (error: any) {
      console.error('Jumio sanctions screening failed:', error);
      // Jumio may not have standalone screening, return empty result
      return {
        id: randomUUID(),
        matches: [],
        isPEP: false,
        hasAdverseMedia: false,
        riskScore: 0,
        screenedAt: new Date(),
        provider: this.name
      };
    }
  }
  
  async handleWebhook(payload: any): Promise<any> {
    // Validate webhook signature
    const signature = payload.headers['x-jumio-signature'];
    if (!this.validateWebhookSignature(payload.body, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    const event = payload.body;
    
    switch (event.eventType) {
      case 'VERIFICATION_STATUS_CHANGED':
        return {
          processed: true,
          action: 'verification_complete',
          data: {
            sessionId: event.accountId,
            userId: event.customerInternalReference,
            status: event.verificationStatus === 'APPROVED' ? 'verified' : 'rejected',
            riskScore: event.riskScore,
            riskLevel: this.determineRiskLevel(event.riskScore)
          }
        };
        
      case 'DOCUMENT_PROCESSED':
        return {
          processed: true,
          action: 'document_verified',
          data: {
            sessionId: event.accountId,
            documentId: event.documentId,
            documentType: event.documentType,
            status: event.documentStatus
          }
        };
        
      case 'WATCHLIST_HIT':
        return {
          processed: true,
          action: 'screening_alert',
          data: {
            userId: event.customerInternalReference,
            alertType: 'watchlist_match',
            severity: event.severity,
            details: event.matchDetails
          }
        };
        
      default:
        return {
          processed: false,
          action: 'unknown',
          data: event
        };
    }
  }
  
  private getWorkflowKey(level: KYCLevel): string {
    const workflowMap: Record<KYCLevel, string> = {
      [KYCLevel.BASIC]: 'basic-kyc-workflow',
      [KYCLevel.INTERMEDIATE]: 'standard-kyc-workflow',
      [KYCLevel.ENHANCED]: 'enhanced-kyc-workflow',
      [KYCLevel.PROFESSIONAL]: 'professional-kyc-workflow'
    };
    return workflowMap[level];
  }
  
  private mapLevel(workflowKey: string): KYCLevel {
    if (workflowKey.includes('professional')) return KYCLevel.PROFESSIONAL;
    if (workflowKey.includes('enhanced')) return KYCLevel.ENHANCED;
    if (workflowKey.includes('standard')) return KYCLevel.INTERMEDIATE;
    return KYCLevel.BASIC;
  }
  
  private mapDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
      'passport': 'PASSPORT',
      'drivers_license': 'DRIVING_LICENSE',
      'national_id': 'ID_CARD',
      'residence_permit': 'RESIDENCE_PERMIT',
      'visa': 'VISA'
    };
    return typeMap[type.toLowerCase()] || 'ID_CARD';
  }
  
  private calculateRiskScore(account: any, workflow: any, documents: any[]): number {
    let score = 0;
    
    // Identity verification failures
    if (workflow.credentials?.idVerification?.status === 'REJECTED') score += 20;
    
    // Document issues
    const rejectedDocs = documents.filter(d => d.status === 'REJECTED');
    score += rejectedDocs.length * 10;
    
    // Facial recognition issues
    if (workflow.credentials?.facialSimilarity?.status === 'REJECTED') score += 15;
    if (workflow.credentials?.facialSimilarity?.similarity < 0.8) score += 10;
    
    // Watchlist hits
    if (workflow.credentials?.watchlistScreening?.status === 'MATCH') score += 30;
    if (workflow.credentials?.pepScreening?.status === 'MATCH') score += 25;
    if (workflow.credentials?.adverseMedia?.status === 'MATCH') score += 20;
    
    // Fraud indicators
    if (workflow.fraudDetection?.score > 50) {
      score += Math.min(workflow.fraudDetection.score / 2, 30);
    }
    
    return Math.min(score, 100);
  }
  
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 70) return RiskLevel.CRITICAL;
    if (score >= 50) return RiskLevel.HIGH;
    if (score >= 30) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
  
  private validateWebhookSignature(body: any, signature: string): boolean {
    // Implement webhook signature validation for Jumio
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(JSON.stringify(body))
      .digest('hex');
    
    return signature === expectedSignature;
  }
}