import axios from 'axios';
import {
  KYCProvider,
  KYCInitiationData,
  KYCSession,
  KYCVerification,
  KYCDocument,
  DocumentUploadResult,
  SanctionsScreeningData,
  SanctionsResult,
  WebhookResult,
  KYCStatus,
  RiskLevel
} from '../types.js';

export class ChainalysisKYCProvider implements KYCProvider {
  name = 'chainalysis';
  private apiKey: string;
  private apiUrl: string;
  private client: any;
  
  constructor() {
    this.apiKey = process.env.CHAINALYSIS_API_KEY || '';
    this.apiUrl = process.env.CHAINALYSIS_API_URL || 'https://api.chainalysis.com/api/kyt/v2';
    
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async initiateVerification(data: KYCInitiationData): Promise<KYCSession> {
    try {
      const response = await this.client.post('/users', {
        externalId: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        metadata: data.metadata
      });
      
      return {
        sessionId: response.data.userId,
        userId: data.userId,
        providerId: this.name,
        status: this.mapStatus(response.data.status),
        requiredDocuments: [],
        verificationUrl: response.data.verificationUrl,
        expiresAt: new Date(response.data.expiresAt),
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error) {
      console.error('Chainalysis KYC initiation failed:', error);
      throw new Error('Failed to initiate KYC verification');
    }
  }
  
  async checkStatus(sessionId: string): Promise<KYCVerification> {
    try {
      const response = await this.client.get(`/users/${sessionId}`);
      
      return this.mapVerification(response.data);
    } catch (error) {
      console.error('Chainalysis status check failed:', error);
      throw new Error('Failed to check verification status');
    }
  }
  
  async uploadDocument(sessionId: string, document: KYCDocument): Promise<DocumentUploadResult> {
    // Chainalysis typically handles documents through their hosted flow
    // This is a placeholder for direct document upload if supported
    throw new Error('Direct document upload not supported. Use verification URL.');
  }
  
  async screenSanctions(data: SanctionsScreeningData): Promise<SanctionsResult> {
    try {
      const response = await this.client.post('/screenings', {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        addresses: data.addresses
      });
      
      return {
        id: response.data.screeningId,
        matches: response.data.matches.map((match: any) => ({
          listName: match.source,
          matchScore: match.score * 100,
          entityType: match.type,
          details: match.details
        })),
        isPEP: response.data.isPEP || false,
        hasAdverseMedia: response.data.hasAdverseMedia || false,
        riskScore: response.data.riskScore,
        screenedAt: new Date(response.data.timestamp)
      };
    } catch (error) {
      console.error('Chainalysis sanctions screening failed:', error);
      throw new Error('Failed to perform sanctions screening');
    }
  }
  
  async getVerificationDetails(verificationId: string): Promise<KYCVerification> {
    return this.checkStatus(verificationId);
  }
  
  async handleWebhook(payload: any): Promise<WebhookResult> {
    // Validate webhook signature
    const signature = payload.headers['x-chainalysis-signature'];
    if (!this.validateWebhookSignature(payload.body, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    const event = payload.body;
    let action: 'status_update' | 'document_verified' | 'verification_complete';
    
    switch (event.type) {
      case 'user.verified':
        action = 'verification_complete';
        break;
      case 'document.verified':
        action = 'document_verified';
        break;
      default:
        action = 'status_update';
    }
    
    return {
      processed: true,
      action,
      data: event
    };
  }
  
  private mapStatus(chainalysisStatus: string): KYCStatus {
    const statusMap: Record<string, KYCStatus> = {
      'pending': KYCStatus.PENDING,
      'processing': KYCStatus.IN_REVIEW,
      'verified': KYCStatus.APPROVED,
      'rejected': KYCStatus.REJECTED,
      'expired': KYCStatus.EXPIRED
    };
    
    return statusMap[chainalysisStatus.toLowerCase()] || KYCStatus.PENDING;
  }
  
  private mapVerification(data: any): KYCVerification {
    return {
      id: data.userId,
      userId: data.externalId,
      sessionId: data.userId,
      status: this.mapStatus(data.status),
      level: data.verificationLevel || 'standard',
      riskScore: data.riskScore || 0,
      riskLevel: this.mapRiskLevel(data.riskScore),
      documents: data.documents?.map((doc: any) => ({
        type: doc.type,
        status: doc.status,
        rejectionReason: doc.rejectionReason,
        uploadedAt: new Date(doc.uploadedAt),
        verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt) : undefined
      })) || [],
      checks: {
        identity: data.checks?.identity || false,
        address: data.checks?.address || false,
        sanctions: data.checks?.sanctions || false,
        pep: data.checks?.pep || false,
        adverseMedia: data.checks?.adverseMedia || false
      },
      rejectionReasons: data.rejectionReasons,
      verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      metadata: data.metadata
    };
  }
  
  private mapRiskLevel(score: number): RiskLevel {
    if (score < 25) return RiskLevel.LOW;
    if (score < 50) return RiskLevel.MEDIUM;
    if (score < 75) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }
  
  private validateWebhookSignature(body: any, signature: string): boolean {
    // Implement Chainalysis webhook signature validation
    // This is a placeholder - actual implementation would use HMAC
    return true;
  }
}