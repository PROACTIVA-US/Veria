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

export class OnfidoProvider implements KYCProvider {
  public readonly name = 'Onfido';
  public readonly providerId = 'onfido';
  private client: AxiosInstance;
  private apiToken: string;
  private webhookToken: string;
  
  constructor() {
    this.apiToken = process.env.ONFIDO_API_TOKEN || '';
    this.webhookToken = process.env.ONFIDO_WEBHOOK_TOKEN || '';
    
    this.client = axios.create({
      baseURL: process.env.ONFIDO_API_URL || 'https://api.eu.onfido.com',
      headers: {
        'Authorization': `Token token=${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }
  
  async initiateVerification(data: KYCInitiationData): Promise<KYCSession> {
    try {
      // Create applicant
      const applicantResponse = await this.client.post('/v3.6/applicants', {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        dob: data.dateOfBirth,
        nationality: data.nationality,
        address: data.address,
        consents: [
          {
            name: 'privacy_policy',
            granted: true,
            granted_at: new Date().toISOString()
          }
        ]
      });
      
      const applicantId = applicantResponse.data.id;
      
      // Create workflow run based on KYC level
      const workflowResponse = await this.client.post('/v3.6/workflow_runs', {
        applicant_id: applicantId,
        workflow_id: this.getWorkflowId(data.requiredLevel),
        tags: {
          user_id: data.userId,
          kyc_level: data.requiredLevel
        },
        link: {
          completed_redirect_url: `${process.env.FRONTEND_URL}/kyc/complete`,
          expired_redirect_url: `${process.env.FRONTEND_URL}/kyc/expired`,
          language: 'en_US'
        }
      });
      
      // Generate SDK token for web/mobile integration
      const sdkTokenResponse = await this.client.post('/v3.6/sdk_token', {
        applicant_id: applicantId,
        application_id: workflowResponse.data.id
      });
      
      return {
        sessionId: workflowResponse.data.id,
        providerId: this.providerId,
        status: KYCStatus.PENDING,
        verificationUrl: workflowResponse.data.link?.url || '',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        additionalData: {
          applicantId,
          sdkToken: sdkTokenResponse.data.token
        }
      };
    } catch (error: any) {
      console.error('Onfido verification initiation failed:', error);
      throw new Error(`Failed to initiate Onfido verification: ${error.message}`);
    }
  }
  
  async checkStatus(sessionId: string): Promise<KYCVerification> {
    try {
      // Get workflow run details
      const workflowResponse = await this.client.get(`/v3.6/workflow_runs/${sessionId}`);
      const workflow = workflowResponse.data;
      
      // Get applicant details
      const applicantResponse = await this.client.get(`/v3.6/applicants/${workflow.applicant_id}`);
      const applicant = applicantResponse.data;
      
      // Get check results if available
      let checks = {
        identity: false,
        document: false,
        facialBiometric: false,
        addressVerification: false,
        phoneVerification: false,
        emailVerification: false,
        sanctionsScreening: false,
        pepScreening: false,
        adverseMediaScreening: false
      };
      
      let documents: any[] = [];
      let riskScore = 0;
      
      if (workflow.output) {
        // Process workflow output
        const output = workflow.output;
        
        // Document verification
        if (output.document_report) {
          checks.document = output.document_report.result === 'clear';
          documents.push({
            type: output.document_report.document_type,
            status: output.document_report.result === 'clear' ? 'verified' : 'rejected',
            verifiedAt: new Date(output.document_report.created_at)
          });
          
          if (output.document_report.result !== 'clear') {
            riskScore += 20;
          }
        }
        
        // Facial similarity
        if (output.facial_similarity_report) {
          checks.facialBiometric = output.facial_similarity_report.result === 'clear';
          
          if (output.facial_similarity_report.result !== 'clear') {
            riskScore += 15;
          }
        }
        
        // Identity verification
        if (output.identity_enhanced_report) {
          checks.identity = output.identity_enhanced_report.result === 'clear';
          
          if (output.identity_enhanced_report.result !== 'clear') {
            riskScore += 25;
          }
        }
        
        // Watchlist screening
        if (output.watchlist_enhanced_report) {
          const watchlistResult = output.watchlist_enhanced_report;
          checks.sanctionsScreening = !watchlistResult.sanctions_matches;
          checks.pepScreening = !watchlistResult.pep_matches;
          checks.adverseMediaScreening = !watchlistResult.adverse_media_matches;
          
          if (watchlistResult.sanctions_matches) riskScore += 30;
          if (watchlistResult.pep_matches) riskScore += 25;
          if (watchlistResult.adverse_media_matches) riskScore += 20;
        }
        
        // Proof of address
        if (output.proof_of_address_report) {
          checks.addressVerification = output.proof_of_address_report.result === 'clear';
          
          if (output.proof_of_address_report.result !== 'clear') {
            riskScore += 10;
          }
        }
      }
      
      // Map workflow status to KYC status
      let status = KYCStatus.PENDING;
      switch (workflow.status) {
        case 'approved':
          status = KYCStatus.APPROVED;
          break;
        case 'declined':
          status = KYCStatus.REJECTED;
          break;
        case 'review':
          status = KYCStatus.REQUIRES_REVIEW;
          break;
        case 'abandoned':
        case 'error':
          status = KYCStatus.EXPIRED;
          break;
        case 'awaiting_input':
        case 'processing':
          status = KYCStatus.IN_PROGRESS;
          break;
      }
      
      // Get rejection reasons
      const rejectionReasons: string[] = [];
      if (workflow.reasons) {
        rejectionReasons.push(...workflow.reasons);
      }
      
      const riskLevel = this.determineRiskLevel(riskScore);
      
      return {
        sessionId,
        providerId: this.providerId,
        status,
        level: this.mapLevel(workflow.workflow_id),
        riskScore,
        riskLevel,
        checks,
        documents,
        rejectionReasons,
        verifiedAt: workflow.completed_at ? new Date(workflow.completed_at) : undefined,
        expiresAt: workflow.expires_at ? new Date(workflow.expires_at) : undefined
      };
    } catch (error: any) {
      console.error('Onfido status check failed:', error);
      throw new Error(`Failed to check Onfido verification status: ${error.message}`);
    }
  }
  
  async uploadDocument(sessionId: string, document: DocumentUpload): Promise<DocumentUploadResult> {
    try {
      // Get workflow details to get applicant ID
      const workflowResponse = await this.client.get(`/v3.6/workflow_runs/${sessionId}`);
      const applicantId = workflowResponse.data.applicant_id;
      
      // Create multipart form data
      const FormData = require('form-data');
      const form = new FormData();
      form.append('type', this.mapDocumentType(document.type));
      form.append('file', document.data, {
        filename: document.fileName,
        contentType: document.mimeType
      });
      
      const response = await this.client.post(
        `/v3.6/documents`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Token token=${this.apiToken}`
          },
          params: {
            applicant_id: applicantId
          }
        }
      );
      
      return {
        documentId: response.data.id,
        status: 'pending',
        message: 'Document uploaded successfully'
      };
    } catch (error: any) {
      console.error('Onfido document upload failed:', error);
      throw new Error(`Failed to upload document to Onfido: ${error.message}`);
    }
  }
  
  async screenSanctions(data: SanctionsScreeningData): Promise<SanctionsScreeningResult> {
    try {
      // Create a standalone watchlist monitor
      const response = await this.client.post('/v3.6/watchlist_monitors', {
        applicant_id: await this.createApplicantForScreening(data),
        report_name: 'watchlist_standard',
        tags: ['sanctions_screening']
      });
      
      // Get the monitor results
      const monitorResponse = await this.client.get(`/v3.6/watchlist_monitors/${response.data.id}/matches`);
      const matches = monitorResponse.data.matches || [];
      
      // Process matches
      const processedMatches = matches.map((match: any) => ({
        listName: match.list_name,
        entityName: match.name,
        matchScore: match.score,
        entityType: match.entity_type,
        notes: match.notes || '',
        lastUpdated: match.last_updated
      }));
      
      // Determine PEP and adverse media
      const isPEP = matches.some((m: any) => m.list_name?.toLowerCase().includes('pep'));
      const hasAdverseMedia = matches.some((m: any) => 
        m.list_name?.toLowerCase().includes('adverse') || 
        m.list_name?.toLowerCase().includes('media')
      );
      
      // Calculate risk score
      let riskScore = 0;
      
      const sanctionsMatches = matches.filter((m: any) => 
        m.list_name?.toLowerCase().includes('sanction') ||
        m.list_name?.toLowerCase().includes('ofac')
      );
      
      if (sanctionsMatches.length > 0) {
        riskScore += Math.min(sanctionsMatches.length * 20, 40);
      }
      
      if (isPEP) riskScore += 30;
      if (hasAdverseMedia) riskScore += 20;
      
      // Add jurisdiction risk
      const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Cuba', 'Myanmar'];
      if (data.nationality && highRiskCountries.includes(data.nationality)) {
        riskScore += 20;
      }
      
      riskScore = Math.min(riskScore, 100);
      
      return {
        id: response.data.id,
        matches: processedMatches,
        isPEP,
        pepDetails: matches.filter((m: any) => m.list_name?.toLowerCase().includes('pep'))
          .map((m: any) => m.notes).join('; '),
        hasAdverseMedia,
        adverseMediaDetails: matches.filter((m: any) => 
          m.list_name?.toLowerCase().includes('adverse') || 
          m.list_name?.toLowerCase().includes('media')
        ).map((m: any) => m.notes).join('; '),
        riskScore,
        screenedAt: new Date(),
        provider: this.name
      };
    } catch (error: any) {
      console.error('Onfido sanctions screening failed:', error);
      throw new Error(`Failed to perform sanctions screening with Onfido: ${error.message}`);
    }
  }
  
  async handleWebhook(payload: any): Promise<any> {
    // Validate webhook signature
    const signature = payload.headers['x-sha2-signature'];
    if (!this.validateWebhookSignature(payload.body, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    const event = payload.body;
    
    switch (event.payload.action) {
      case 'workflow_run.completed':
        const workflow = event.payload.object;
        return {
          processed: true,
          action: 'verification_complete',
          data: {
            sessionId: workflow.id,
            userId: workflow.tags?.user_id,
            status: workflow.status === 'approved' ? 'verified' : 'rejected',
            riskScore: this.calculateRiskFromWorkflow(workflow),
            riskLevel: this.determineRiskLevel(this.calculateRiskFromWorkflow(workflow))
          }
        };
        
      case 'check.completed':
        return {
          processed: true,
          action: 'check_complete',
          data: {
            checkId: event.payload.object.id,
            checkType: event.payload.object.type,
            result: event.payload.object.result,
            applicantId: event.payload.object.applicant_id
          }
        };
        
      case 'report.completed':
        return {
          processed: true,
          action: 'report_complete',
          data: {
            reportId: event.payload.object.id,
            reportType: event.payload.object.name,
            result: event.payload.object.result,
            checkId: event.payload.object.check_id
          }
        };
        
      case 'watchlist_monitor.matches_updated':
        return {
          processed: true,
          action: 'screening_alert',
          data: {
            monitorId: event.payload.object.id,
            alertType: 'watchlist_update',
            severity: 'high',
            details: event.payload.object
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
  
  private async createApplicantForScreening(data: SanctionsScreeningData): Promise<string> {
    const response = await this.client.post('/v3.6/applicants', {
      first_name: data.firstName,
      last_name: data.lastName,
      dob: data.dateOfBirth,
      nationality: data.nationality
    });
    
    return response.data.id;
  }
  
  private getWorkflowId(level: KYCLevel): string {
    // These would be configured in Onfido Studio
    const workflowMap: Record<KYCLevel, string> = {
      [KYCLevel.BASIC]: process.env.ONFIDO_WORKFLOW_BASIC || 'basic-workflow-id',
      [KYCLevel.INTERMEDIATE]: process.env.ONFIDO_WORKFLOW_INTERMEDIATE || 'intermediate-workflow-id',
      [KYCLevel.ENHANCED]: process.env.ONFIDO_WORKFLOW_ENHANCED || 'enhanced-workflow-id',
      [KYCLevel.PROFESSIONAL]: process.env.ONFIDO_WORKFLOW_PROFESSIONAL || 'professional-workflow-id'
    };
    return workflowMap[level];
  }
  
  private mapLevel(workflowId: string): KYCLevel {
    // Map workflow ID back to KYC level
    if (workflowId === process.env.ONFIDO_WORKFLOW_PROFESSIONAL) return KYCLevel.PROFESSIONAL;
    if (workflowId === process.env.ONFIDO_WORKFLOW_ENHANCED) return KYCLevel.ENHANCED;
    if (workflowId === process.env.ONFIDO_WORKFLOW_INTERMEDIATE) return KYCLevel.INTERMEDIATE;
    return KYCLevel.BASIC;
  }
  
  private mapDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
      'passport': 'passport',
      'drivers_license': 'driving_licence',
      'national_id': 'national_identity_card',
      'residence_permit': 'residence_permit',
      'visa': 'visa'
    };
    return typeMap[type.toLowerCase()] || 'national_identity_card';
  }
  
  private calculateRiskFromWorkflow(workflow: any): number {
    let score = 0;
    
    if (workflow.output) {
      const output = workflow.output;
      
      // Check each report type
      if (output.document_report?.result !== 'clear') score += 20;
      if (output.facial_similarity_report?.result !== 'clear') score += 15;
      if (output.identity_enhanced_report?.result !== 'clear') score += 25;
      
      // Watchlist hits
      if (output.watchlist_enhanced_report) {
        if (output.watchlist_enhanced_report.sanctions_matches) score += 30;
        if (output.watchlist_enhanced_report.pep_matches) score += 25;
        if (output.watchlist_enhanced_report.adverse_media_matches) score += 20;
      }
      
      if (output.proof_of_address_report?.result !== 'clear') score += 10;
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
    // Implement Onfido webhook signature validation
    const crypto = require('crypto');
    const computedSignature = crypto
      .createHmac('sha256', this.webhookToken)
      .update(JSON.stringify(body))
      .digest('hex');
    
    return signature === computedSignature;
  }
}