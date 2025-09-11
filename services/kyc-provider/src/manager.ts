import { KYCProvider, KYCInitiationData, KYCSession, KYCVerification, SanctionsScreeningData } from './types.js';
import { MockKYCProvider } from './providers/mock.js';
import { ChainalysisKYCProvider } from './providers/chainalysis.js';
import { TRMLabsProvider } from './providers/trm.js';
import { JumioProvider } from './providers/jumio.js';
import { OnfidoProvider } from './providers/onfido.js';

export class KYCProviderManager {
  private providers: Map<string, KYCProvider> = new Map();
  private primaryProvider: string;
  private fallbackProvider: string;
  
  constructor() {
    // Initialize providers based on environment
    this.initializeProviders();
    
    this.primaryProvider = process.env.KYC_PRIMARY_PROVIDER || 'mock';
    this.fallbackProvider = process.env.KYC_FALLBACK_PROVIDER || 'mock';
  }
  
  private initializeProviders() {
    // Always include mock provider for testing
    this.providers.set('mock', new MockKYCProvider());
    
    // Add real providers if configured
    if (process.env.CHAINALYSIS_API_KEY) {
      this.providers.set('chainalysis', new ChainalysisKYCProvider());
    }
    
    if (process.env.TRM_API_KEY) {
      this.providers.set('trm', new TRMLabsProvider());
    }
    
    if (process.env.JUMIO_API_TOKEN) {
      this.providers.set('jumio', new JumioProvider());
    }
    
    if (process.env.ONFIDO_API_TOKEN) {
      this.providers.set('onfido', new OnfidoProvider());
    }
  }
  
  getProvider(name?: string): KYCProvider {
    const providerName = name || this.primaryProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      // Fallback to secondary provider
      const fallback = this.providers.get(this.fallbackProvider);
      if (!fallback) {
        throw new Error(`KYC provider not found: ${providerName}`);
      }
      console.warn(`Primary provider ${providerName} not available, using fallback: ${this.fallbackProvider}`);
      return fallback;
    }
    
    return provider;
  }
  
  async initiateVerification(data: KYCInitiationData, providerName?: string): Promise<KYCSession> {
    const provider = this.getProvider(providerName);
    
    try {
      return await provider.initiateVerification(data);
    } catch (error) {
      console.error(`KYC initiation failed with ${provider.name}:`, error);
      
      // Try fallback provider if primary fails
      if (provider.name !== this.fallbackProvider) {
        console.log(`Attempting fallback provider: ${this.fallbackProvider}`);
        const fallback = this.getProvider(this.fallbackProvider);
        return await fallback.initiateVerification(data);
      }
      
      throw error;
    }
  }
  
  async checkStatus(sessionId: string, providerName?: string): Promise<KYCVerification> {
    // Extract provider from session ID if not specified
    const provider = providerName ? 
      this.getProvider(providerName) : 
      this.getProviderFromSession(sessionId);
    
    return await provider.checkStatus(sessionId);
  }
  
  async screenSanctions(data: SanctionsScreeningData, providerName?: string): Promise<any> {
    const provider = this.getProvider(providerName);
    
    try {
      return await provider.screenSanctions(data);
    } catch (error) {
      console.error(`Sanctions screening failed with ${provider.name}:`, error);
      
      // Try fallback for sanctions screening
      if (provider.name !== this.fallbackProvider) {
        const fallback = this.getProvider(this.fallbackProvider);
        return await fallback.screenSanctions(data);
      }
      
      throw error;
    }
  }
  
  async handleWebhook(providerName: string, payload: any): Promise<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown webhook provider: ${providerName}`);
    }
    
    return await provider.handleWebhook(payload);
  }
  
  private getProviderFromSession(sessionId: string): KYCProvider {
    // Try to determine provider from session ID format
    if (sessionId.startsWith('mock-')) {
      return this.getProvider('mock');
    }
    
    // Default to primary provider
    return this.getProvider();
  }
  
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  getPrimaryProvider(): string {
    return this.primaryProvider;
  }
  
  getFallbackProvider(): string {
    return this.fallbackProvider;
  }
}

export const kycProviderManager = new KYCProviderManager();