import { randomUUID } from 'crypto';
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
  RiskLevel,
  DocumentType
} from '../types.js';

export class MockKYCProvider implements KYCProvider {
  name = 'mock';
  private sessions = new Map<string, KYCSession>();
  private verifications = new Map<string, KYCVerification>();
  
  async initiateVerification(data: KYCInitiationData): Promise<KYCSession> {
    const sessionId = `mock-session-${randomUUID()}`;
    const session: KYCSession = {
      sessionId,
      userId: data.userId,
      providerId: this.name,
      status: KYCStatus.PENDING,
      requiredDocuments: this.getRequiredDocuments(data.requiredLevel),
      verificationUrl: `https://mock-kyc.example.com/verify/${sessionId}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    
    // Create initial verification record
    const verification: KYCVerification = {
      id: `mock-verification-${randomUUID()}`,
      userId: data.userId,
      sessionId,
      status: KYCStatus.PENDING,
      level: data.requiredLevel,
      riskScore: 0,
      riskLevel: RiskLevel.LOW,
      documents: [],
      checks: {
        identity: false,
        address: false,
        sanctions: false,
        pep: false,
        adverseMedia: false
      },
      metadata: data.metadata
    };
    
    this.verifications.set(sessionId, verification);
    
    return session;
  }
  
  async checkStatus(sessionId: string): Promise<KYCVerification> {
    const verification = this.verifications.get(sessionId);
    if (!verification) {
      throw new Error(`Verification not found for session: ${sessionId}`);
    }
    
    // Simulate random status updates
    if (verification.status === KYCStatus.PENDING && Math.random() > 0.7) {
      verification.status = KYCStatus.IN_REVIEW;
    } else if (verification.status === KYCStatus.IN_REVIEW && Math.random() > 0.8) {
      verification.status = Math.random() > 0.2 ? KYCStatus.APPROVED : KYCStatus.REJECTED;
      
      if (verification.status === KYCStatus.APPROVED) {
        verification.verifiedAt = new Date();
        verification.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        verification.checks = {
          identity: true,
          address: true,
          sanctions: true,
          pep: false,
          adverseMedia: false
        };
        verification.riskScore = Math.floor(Math.random() * 30); // Low risk
        verification.riskLevel = RiskLevel.LOW;
      } else {
        verification.rejectionReasons = ['Document quality insufficient', 'Name mismatch detected'];
        verification.riskScore = Math.floor(Math.random() * 50) + 50; // High risk
        verification.riskLevel = RiskLevel.HIGH;
      }
    }
    
    return verification;
  }
  
  async uploadDocument(sessionId: string, document: KYCDocument): Promise<DocumentUploadResult> {
    const verification = this.verifications.get(sessionId);
    if (!verification) {
      throw new Error(`Verification not found for session: ${sessionId}`);
    }
    
    const documentId = `mock-doc-${randomUUID()}`;
    
    // Add document to verification
    verification.documents.push({
      type: document.type,
      status: 'pending',
      uploadedAt: new Date()
    });
    
    // Simulate document processing
    setTimeout(() => {
      const doc = verification.documents.find(d => d.type === document.type);
      if (doc) {
        doc.status = Math.random() > 0.1 ? 'verified' : 'rejected';
        if (doc.status === 'verified') {
          doc.verifiedAt = new Date();
        } else {
          doc.rejectionReason = 'Document unclear or expired';
        }
      }
    }, 2000);
    
    return {
      documentId,
      status: 'uploaded',
      message: 'Document uploaded successfully'
    };
  }
  
  async screenSanctions(data: SanctionsScreeningData): Promise<SanctionsResult> {
    // Simulate sanctions screening
    const hasMatch = Math.random() > 0.95; // 5% chance of match
    const isPEP = Math.random() > 0.98; // 2% chance of PEP
    const hasAdverseMedia = Math.random() > 0.97; // 3% chance
    
    const result: SanctionsResult = {
      id: `mock-screening-${randomUUID()}`,
      matches: hasMatch ? [{
        listName: 'OFAC SDN List',
        matchScore: Math.random() * 30 + 70,
        entityType: 'individual',
        details: {
          reason: 'Name similarity detected',
          lastUpdated: new Date().toISOString()
        }
      }] : [],
      isPEP,
      hasAdverseMedia,
      riskScore: hasMatch || isPEP || hasAdverseMedia ? 
        Math.floor(Math.random() * 50) + 50 : 
        Math.floor(Math.random() * 30),
      screenedAt: new Date()
    };
    
    return result;
  }
  
  async getVerificationDetails(verificationId: string): Promise<KYCVerification> {
    const verification = Array.from(this.verifications.values())
      .find(v => v.id === verificationId || v.sessionId === verificationId);
    
    if (!verification) {
      throw new Error(`Verification not found: ${verificationId}`);
    }
    
    return verification;
  }
  
  async handleWebhook(payload: any): Promise<WebhookResult> {
    // Mock webhook handling
    console.log('Mock webhook received:', payload);
    
    return {
      processed: true,
      action: 'status_update',
      data: payload
    };
  }
  
  private getRequiredDocuments(level: string): DocumentType[] {
    switch (level) {
      case 'basic':
        return [DocumentType.SELFIE];
      case 'standard':
        return [DocumentType.PASSPORT, DocumentType.SELFIE];
      case 'enhanced':
        return [DocumentType.PASSPORT, DocumentType.PROOF_OF_ADDRESS, DocumentType.SELFIE];
      case 'full':
        return [
          DocumentType.PASSPORT,
          DocumentType.PROOF_OF_ADDRESS,
          DocumentType.BANK_STATEMENT,
          DocumentType.SOURCE_OF_FUNDS,
          DocumentType.SELFIE
        ];
      default:
        return [DocumentType.PASSPORT, DocumentType.SELFIE];
    }
  }
}