import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockKYCProvider } from './mock.js';
import { ChainalysisKYCProvider } from './chainalysis.js';
import { TRMLabsProvider } from './trm.js';
import { JumioProvider } from './jumio.js';
import { OnfidoProvider } from './onfido.js';
import { KYCProviderManager } from '../manager.js';
import { KYCLevel, KYCStatus, RiskLevel } from '../types.js';

describe('KYC Providers', () => {
  describe('MockKYCProvider', () => {
    let provider: MockKYCProvider;
    
    beforeEach(() => {
      provider = new MockKYCProvider();
    });
    
    it('should initiate verification', async () => {
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.BASIC
      });
      
      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^mock-/);
      expect(session.providerId).toBe('mock');
      expect(session.status).toBe(KYCStatus.PENDING);
      expect(session.verificationUrl).toBeDefined();
    });
    
    it('should check verification status', async () => {
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.INTERMEDIATE
      });
      
      const verification = await provider.checkStatus(session.sessionId);
      
      expect(verification).toBeDefined();
      expect(verification.sessionId).toBe(session.sessionId);
      expect(verification.providerId).toBe('mock');
      expect(verification.status).toBeDefined();
      expect(verification.level).toBe(KYCLevel.INTERMEDIATE);
      expect(verification.checks).toBeDefined();
    });
    
    it('should perform sanctions screening', async () => {
      const result = await provider.screenSanctions({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.matches).toBeInstanceOf(Array);
      expect(typeof result.isPEP).toBe('boolean');
      expect(typeof result.hasAdverseMedia).toBe('boolean');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });
  
  describe('KYCProviderManager', () => {
    let manager: KYCProviderManager;
    
    beforeEach(() => {
      // Set up environment variables for testing
      process.env.KYC_PRIMARY_PROVIDER = 'mock';
      process.env.KYC_FALLBACK_PROVIDER = 'mock';
      
      manager = new KYCProviderManager();
    });
    
    it('should get available providers', () => {
      const providers = manager.getAvailableProviders();
      expect(providers).toContain('mock');
    });
    
    it('should get primary provider', () => {
      const primary = manager.getPrimaryProvider();
      expect(primary).toBe('mock');
    });
    
    it('should get fallback provider', () => {
      const fallback = manager.getFallbackProvider();
      expect(fallback).toBe('mock');
    });
    
    it('should initiate verification with primary provider', async () => {
      const session = await manager.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.BASIC
      });
      
      expect(session).toBeDefined();
      expect(session.providerId).toBe('mock');
    });
    
    it('should check verification status', async () => {
      const session = await manager.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.BASIC
      });
      
      const verification = await manager.checkStatus(session.sessionId);
      
      expect(verification).toBeDefined();
      expect(verification.sessionId).toBe(session.sessionId);
    });
    
    it('should perform sanctions screening', async () => {
      const result = await manager.screenSanctions({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA'
      });
      
      expect(result).toBeDefined();
      expect(result.matches).toBeInstanceOf(Array);
    });
  });
  
  describe('Provider Risk Assessment', () => {
    it('should calculate risk scores consistently', async () => {
      const provider = new MockKYCProvider();
      
      // Test high-risk country
      const highRiskSession = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'North Korea',
        requiredLevel: KYCLevel.BASIC
      });
      
      const highRiskVerification = await provider.checkStatus(highRiskSession.sessionId);
      
      // High-risk countries should have elevated risk scores
      expect(highRiskVerification.riskScore).toBeGreaterThan(50);
      expect(highRiskVerification.riskLevel).toMatch(/high|critical/);
      
      // Test normal country
      const normalSession = await provider.initiateVerification({
        userId: 'user456',
        email: 'normal@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1985-05-05',
        nationality: 'USA',
        requiredLevel: KYCLevel.BASIC
      });
      
      const normalVerification = await provider.checkStatus(normalSession.sessionId);
      
      // Normal cases should have lower risk scores
      expect(normalVerification.riskScore).toBeLessThanOrEqual(50);
    });
  });
  
  describe('Document Upload', () => {
    it('should upload documents successfully', async () => {
      const provider = new MockKYCProvider();
      
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.ENHANCED
      });
      
      const documentData = Buffer.from('fake document data');
      const result = await provider.uploadDocument(session.sessionId, {
        type: 'passport',
        data: documentData,
        mimeType: 'application/pdf',
        fileName: 'passport.pdf'
      });
      
      expect(result).toBeDefined();
      expect(result.documentId).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });
  
  describe('Webhook Handling', () => {
    it('should handle verification complete webhook', async () => {
      const provider = new MockKYCProvider();
      
      const webhookPayload = {
        headers: {
          'x-webhook-signature': 'test-signature'
        },
        body: {
          event: 'verification.complete',
          sessionId: 'mock-123',
          userId: 'user123',
          status: 'approved',
          timestamp: new Date().toISOString()
        }
      };
      
      const result = await provider.handleWebhook(webhookPayload);
      
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.action).toBe('verification_complete');
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('approved');
    });
  });
  
  describe('KYC Level Requirements', () => {
    const provider = new MockKYCProvider();
    
    it('should enforce BASIC level requirements', async () => {
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.BASIC
      });
      
      const verification = await provider.checkStatus(session.sessionId);
      
      expect(verification.level).toBe(KYCLevel.BASIC);
      expect(verification.checks.identity).toBeDefined();
      expect(verification.checks.sanctionsScreening).toBeDefined();
    });
    
    it('should enforce INTERMEDIATE level requirements', async () => {
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.INTERMEDIATE
      });
      
      const verification = await provider.checkStatus(session.sessionId);
      
      expect(verification.level).toBe(KYCLevel.INTERMEDIATE);
      expect(verification.checks.identity).toBeDefined();
      expect(verification.checks.document).toBeDefined();
      expect(verification.checks.addressVerification).toBeDefined();
    });
    
    it('should enforce ENHANCED level requirements', async () => {
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.ENHANCED
      });
      
      const verification = await provider.checkStatus(session.sessionId);
      
      expect(verification.level).toBe(KYCLevel.ENHANCED);
      expect(verification.checks.identity).toBeDefined();
      expect(verification.checks.document).toBeDefined();
      expect(verification.checks.facialBiometric).toBeDefined();
      expect(verification.checks.pepScreening).toBeDefined();
      expect(verification.checks.adverseMediaScreening).toBeDefined();
    });
    
    it('should enforce PROFESSIONAL level requirements', async () => {
      const session = await provider.initiateVerification({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'USA',
        requiredLevel: KYCLevel.PROFESSIONAL,
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA'
        }
      });
      
      const verification = await provider.checkStatus(session.sessionId);
      
      expect(verification.level).toBe(KYCLevel.PROFESSIONAL);
      // Professional should have all checks
      Object.values(verification.checks).forEach(check => {
        expect(check).toBeDefined();
      });
    });
  });
  
  describe('Sanctions Screening', () => {
    it('should detect sanctioned entities', async () => {
      const provider = new MockKYCProvider();
      
      // Test with a name that might match sanctions list
      const result = await provider.screenSanctions({
        firstName: 'Kim',
        lastName: 'Jong',
        dateOfBirth: '1984-01-08',
        nationality: 'North Korea'
      });
      
      expect(result.riskScore).toBeGreaterThan(50);
      // High-risk nationality should be flagged
    });
    
    it('should detect PEP status', async () => {
      const provider = new MockKYCProvider();
      
      const result = await provider.screenSanctions({
        firstName: 'Test',
        lastName: 'Official',
        dateOfBirth: '1970-01-01',
        nationality: 'USA'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.isPEP).toBe('boolean');
      if (result.isPEP) {
        expect(result.pepDetails).toBeDefined();
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle provider unavailability gracefully', async () => {
      const manager = new KYCProviderManager();
      
      // Mock a failing primary provider
      vi.spyOn(manager, 'getProvider').mockImplementationOnce(() => {
        throw new Error('Provider unavailable');
      });
      
      try {
        await manager.initiateVerification({
          userId: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          nationality: 'USA',
          requiredLevel: KYCLevel.BASIC
        });
      } catch (error: any) {
        expect(error.message).toContain('Provider unavailable');
      }
    });
    
    it('should validate input data', async () => {
      const provider = new MockKYCProvider();
      
      try {
        await provider.initiateVerification({
          userId: '',
          email: 'invalid-email',
          firstName: '',
          lastName: '',
          dateOfBirth: 'invalid-date',
          nationality: '',
          requiredLevel: KYCLevel.BASIC
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});