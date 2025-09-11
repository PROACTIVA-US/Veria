import { z } from 'zod';

// KYC Verification Levels
export enum KYCLevel {
  BASIC = 'basic',        // Email + Phone verification
  STANDARD = 'standard',  // ID Document verification
  ENHANCED = 'enhanced',  // ID + Proof of Address
  FULL = 'full'          // Enhanced + Source of Funds
}

// KYC Status
export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// Document Types
export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  NATIONAL_ID = 'national_id',
  PROOF_OF_ADDRESS = 'proof_of_address',
  BANK_STATEMENT = 'bank_statement',
  UTILITY_BILL = 'utility_bill',
  SELFIE = 'selfie',
  SOURCE_OF_FUNDS = 'source_of_funds'
}

// Risk Levels
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// KYC Provider Interface
export interface KYCProvider {
  name: string;
  
  // Initiate KYC verification
  initiateVerification(data: KYCInitiationData): Promise<KYCSession>;
  
  // Check verification status
  checkStatus(sessionId: string): Promise<KYCVerification>;
  
  // Upload document
  uploadDocument(sessionId: string, document: KYCDocument): Promise<DocumentUploadResult>;
  
  // Perform sanctions screening
  screenSanctions(data: SanctionsScreeningData): Promise<SanctionsResult>;
  
  // Get verification details
  getVerificationDetails(verificationId: string): Promise<KYCVerification>;
  
  // Webhook handling
  handleWebhook(payload: any): Promise<WebhookResult>;
}

// Data Schemas
export const KYCInitiationDataSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  requiredLevel: z.nativeEnum(KYCLevel),
  metadata: z.record(z.any()).optional()
});

export type KYCInitiationData = z.infer<typeof KYCInitiationDataSchema>;

export const KYCDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  data: z.instanceof(Buffer),
  mimeType: z.string(),
  fileName: z.string(),
  metadata: z.record(z.any()).optional()
});

export type KYCDocument = z.infer<typeof KYCDocumentSchema>;

export const KYCSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string().uuid(),
  providerId: z.string(),
  status: z.nativeEnum(KYCStatus),
  requiredDocuments: z.array(z.nativeEnum(DocumentType)),
  verificationUrl: z.string().optional(),
  expiresAt: z.date(),
  createdAt: z.date()
});

export type KYCSession = z.infer<typeof KYCSessionSchema>;

export const KYCVerificationSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  sessionId: z.string(),
  status: z.nativeEnum(KYCStatus),
  level: z.nativeEnum(KYCLevel),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  documents: z.array(z.object({
    type: z.nativeEnum(DocumentType),
    status: z.enum(['pending', 'verified', 'rejected']),
    rejectionReason: z.string().optional(),
    uploadedAt: z.date(),
    verifiedAt: z.date().optional()
  })),
  checks: z.object({
    identity: z.boolean(),
    address: z.boolean(),
    sanctions: z.boolean(),
    pep: z.boolean(),
    adverseMedia: z.boolean()
  }),
  rejectionReasons: z.array(z.string()).optional(),
  verifiedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

export type KYCVerification = z.infer<typeof KYCVerificationSchema>;

export const SanctionsScreeningDataSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  addresses: z.array(z.object({
    country: z.string(),
    city: z.string().optional(),
    postalCode: z.string().optional()
  })).optional()
});

export type SanctionsScreeningData = z.infer<typeof SanctionsScreeningDataSchema>;

export const SanctionsResultSchema = z.object({
  id: z.string(),
  matches: z.array(z.object({
    listName: z.string(),
    matchScore: z.number(),
    entityType: z.enum(['individual', 'organization']),
    details: z.record(z.any())
  })),
  isPEP: z.boolean(),
  hasAdverseMedia: z.boolean(),
  riskScore: z.number(),
  screenedAt: z.date()
});

export type SanctionsResult = z.infer<typeof SanctionsResultSchema>;

export const DocumentUploadResultSchema = z.object({
  documentId: z.string(),
  status: z.enum(['uploaded', 'processing', 'verified', 'rejected']),
  message: z.string().optional()
});

export type DocumentUploadResult = z.infer<typeof DocumentUploadResultSchema>;

export const WebhookResultSchema = z.object({
  processed: z.boolean(),
  action: z.enum(['status_update', 'document_verified', 'verification_complete']),
  data: z.any()
});

export type WebhookResult = z.infer<typeof WebhookResultSchema>;