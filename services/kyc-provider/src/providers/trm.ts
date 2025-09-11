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

export class TRMLabsProvider implements KYCProvider {
  public readonly name = 'TRM Labs';
  public readonly providerId = 'trm';
  private client: AxiosInstance;
  private apiKey: string;
  private webhookSecret: string;
  
  constructor() {
    this.apiKey = process.env.TRM_API_KEY || '';
    this.webhookSecret = process.env.TRM_WEBHOOK_SECRET || '';
    
    this.client = axios.create({
      baseURL: process.env.TRM_API_URL || 'https://api.trmlabs.com',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-TRM-Version': '2024-01-01'
      },
      timeout: 30000
    });
  }
  
  async initiateVerification(data: KYCInitiationData): Promise<KYCSession> {
    try {
      const response = await this.client.post('/v1/verifications', {
        user_id: data.userId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        nationality: data.nationality,
        required_level: this.mapKYCLevel(data.requiredLevel),
        callback_url: process.env.TRM_CALLBACK_URL || `${process.env.BASE_URL}/api/v1/kyc/webhook/trm`,
        metadata: {
          internal_user_id: data.userId,
          requested_at: new Date().toISOString()
        }
      });
      
      return {
        sessionId: response.data.verification_id,
        providerId: this.providerId,
        status: this.mapStatus(response.data.status),
        verificationUrl: response.data.verification_url,
        expiresAt: new Date(response.data.expires_at)
      };
    } catch (error: any) {
      console.error('TRM Labs verification initiation failed:', error);
      throw new Error(`Failed to initiate TRM Labs verification: ${error.message}`);
    }
  }
  
  async checkStatus(sessionId: string): Promise<KYCVerification> {
    try {
      const response = await this.client.get(`/v1/verifications/${sessionId}`);
      const data = response.data;
      
      // Perform additional checks
      const checks = {
        identity: data.checks?.identity || false,
        document: data.checks?.document || false,
        facialBiometric: data.checks?.facial_biometric || false,
        addressVerification: data.checks?.address || false,
        phoneVerification: data.checks?.phone || false,
        emailVerification: data.checks?.email || false,
        sanctionsScreening: data.checks?.sanctions || false,
        pepScreening: data.checks?.pep || false,
        adverseMediaScreening: data.checks?.adverse_media || false
      };
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(data);
      const riskLevel = this.determineRiskLevel(riskScore);
      
      return {
        sessionId,
        providerId: this.providerId,
        status: this.mapStatus(data.status),
        level: this.mapLevel(data.verification_level),
        riskScore,
        riskLevel,
        checks,
        documents: data.documents?.map((doc: any) => ({
          type: doc.type,
          status: doc.status,
          verifiedAt: doc.verified_at ? new Date(doc.verified_at) : undefined
        })) || [],
        rejectionReasons: data.rejection_reasons || [],
        verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
      };
    } catch (error: any) {
      console.error('TRM Labs status check failed:', error);
      throw new Error(`Failed to check TRM Labs verification status: ${error.message}`);
    }
  }
  
  async uploadDocument(sessionId: string, document: DocumentUpload): Promise<DocumentUploadResult> {
    try {
      // Create form data for document upload
      const formData = new FormData();
      formData.append('document', new Blob([document.data]), document.fileName);
      formData.append('document_type', document.type);
      formData.append('mime_type', document.mimeType);
      
      const response = await this.client.post(
        `/v1/verifications/${sessionId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return {
        documentId: response.data.document_id,
        status: response.data.status === 'uploaded' ? 'pending' : response.data.status,
        message: response.data.message || 'Document uploaded successfully'
      };
    } catch (error: any) {
      console.error('TRM Labs document upload failed:', error);
      throw new Error(`Failed to upload document to TRM Labs: ${error.message}`);
    }
  }
  
  async screenSanctions(data: SanctionsScreeningData): Promise<SanctionsScreeningResult> {
    try {
      const response = await this.client.post('/v1/screenings/sanctions', {
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        nationality: data.nationality,
        include_pep: true,
        include_adverse_media: true,
        fuzzy_matching: true,
        threshold: 0.85
      });
      
      const screeningData = response.data;
      
      // Process matches
      const matches = screeningData.matches?.map((match: any) => ({
        listName: match.list_name,
        entityName: match.entity_name,
        matchScore: match.score,
        entityType: match.entity_type,
        notes: match.notes,
        lastUpdated: match.last_updated
      })) || [];
      
      // Calculate risk score based on matches and other factors
      let riskScore = 0;
      
      // Sanctions matches
      if (matches.length > 0) {
        riskScore += Math.min(matches.length * 20, 60);
      }
      
      // PEP status
      if (screeningData.is_pep) {
        riskScore += 30;
      }
      
      // Adverse media
      if (screeningData.has_adverse_media) {
        riskScore += 20;
      }
      
      // High-risk jurisdictions
      const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Cuba', 'Myanmar'];
      if (data.nationality && highRiskCountries.includes(data.nationality)) {
        riskScore += 25;
      }
      
      riskScore = Math.min(riskScore, 100);
      
      return {
        id: screeningData.screening_id || randomUUID(),
        matches,
        isPEP: screeningData.is_pep || false,
        pepDetails: screeningData.pep_details,
        hasAdverseMedia: screeningData.has_adverse_media || false,
        adverseMediaDetails: screeningData.adverse_media_details,
        riskScore,
        screenedAt: new Date(),
        provider: this.name
      };
    } catch (error: any) {
      console.error('TRM Labs sanctions screening failed:', error);
      throw new Error(`Failed to perform sanctions screening with TRM Labs: ${error.message}`);
    }
  }
  
  async handleWebhook(payload: any): Promise<any> {
    // Validate webhook signature
    const signature = payload.headers['x-trm-signature'];
    if (!this.validateWebhookSignature(payload.body, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    const event = payload.body;
    
    switch (event.type) {
      case 'verification.completed':
        return {
          processed: true,
          action: 'verification_complete',
          data: {
            sessionId: event.data.verification_id,
            userId: event.data.metadata?.internal_user_id,
            status: event.data.status === 'approved' ? 'verified' : 'rejected',
            riskScore: event.data.risk_score,
            riskLevel: event.data.risk_level
          }
        };
        
      case 'document.verified':
        return {
          processed: true,
          action: 'document_verified',
          data: {
            sessionId: event.data.verification_id,
            documentId: event.data.document_id,
            documentType: event.data.document_type,
            status: event.data.status
          }
        };
        
      case 'screening.alert':
        return {
          processed: true,
          action: 'screening_alert',
          data: {
            userId: event.data.user_id,
            alertType: event.data.alert_type,
            severity: event.data.severity,
            details: event.data.details
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
  
  private mapKYCLevel(level: KYCLevel): string {
    const levelMap: Record<KYCLevel, string> = {
      [KYCLevel.BASIC]: 'basic',
      [KYCLevel.INTERMEDIATE]: 'standard',
      [KYCLevel.ENHANCED]: 'enhanced',
      [KYCLevel.PROFESSIONAL]: 'professional'
    };
    return levelMap[level];
  }
  
  private mapStatus(status: string): KYCStatus {
    const statusMap: Record<string, KYCStatus> = {
      'pending': KYCStatus.PENDING,
      'in_progress': KYCStatus.IN_PROGRESS,
      'approved': KYCStatus.APPROVED,
      'rejected': KYCStatus.REJECTED,
      'expired': KYCStatus.EXPIRED,
      'requires_review': KYCStatus.REQUIRES_REVIEW
    };
    return statusMap[status.toLowerCase()] || KYCStatus.PENDING;
  }
  
  private mapLevel(level: string): KYCLevel {
    const levelMap: Record<string, KYCLevel> = {
      'basic': KYCLevel.BASIC,
      'standard': KYCLevel.INTERMEDIATE,
      'enhanced': KYCLevel.ENHANCED,
      'professional': KYCLevel.PROFESSIONAL
    };
    return levelMap[level.toLowerCase()] || KYCLevel.BASIC;
  }
  
  private calculateRiskScore(data: any): number {
    let score = 0;
    
    // Document verification
    if (!data.checks?.document) score += 15;
    if (!data.checks?.facial_biometric) score += 10;
    
    // Sanctions and screening
    if (data.sanctions_matches > 0) score += 30;
    if (data.pep_matches > 0) score += 25;
    if (data.adverse_media_matches > 0) score += 20;
    
    // Jurisdiction risk
    const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Cuba'];
    if (data.nationality && highRiskCountries.includes(data.nationality)) {
      score += 25;
    }
    
    // Transaction patterns (if available)
    if (data.suspicious_activity_score) {
      score += Math.min(data.suspicious_activity_score, 30);
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
    // Implement webhook signature validation
    // This would typically use HMAC-SHA256 with the webhook secret
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');
    
    return signature === expectedSignature;
  }
}