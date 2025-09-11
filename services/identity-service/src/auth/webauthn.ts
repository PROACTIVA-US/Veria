import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import { randomBytes } from 'crypto';

export interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  backedUp: boolean;
  name?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export class WebAuthnService {
  private rpName: string;
  private rpId: string;
  private origin: string;
  private challenges: Map<string, { challenge: string; userId: string; expires: Date }> = new Map();
  
  constructor() {
    this.rpName = process.env.WEBAUTHN_RP_NAME || 'Veria Platform';
    this.rpId = process.env.WEBAUTHN_RP_ID || 'localhost';
    this.origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
    
    // Clean up expired challenges every minute
    setInterval(() => this.cleanupChallenges(), 60000);
  }
  
  // Generate registration options for new passkey
  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
    userName: string,
    existingCredentials: PasskeyCredential[] = []
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const userIdBuffer = Buffer.from(userId);
    
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: userIdBuffer,
      userName: userEmail,
      userDisplayName: userName,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: Buffer.from(cred.credentialId, 'base64url'),
        type: 'public-key',
        transports: cred.transports as any
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    });
    
    // Store challenge for verification
    this.storeChallenge(options.challenge, userId);
    
    return options;
  }
  
  // Verify registration response
  async verifyRegistrationResponse(
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    expectedOrigin?: string,
    expectedRPID?: string
  ): Promise<{ verified: boolean; registrationInfo?: any }> {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: expectedOrigin || this.origin,
        expectedRPID: expectedRPID || this.rpId,
        requireUserVerification: true
      });
      
      return verification;
    } catch (error) {
      console.error('Registration verification failed:', error);
      return { verified: false };
    }
  }
  
  // Generate authentication options
  async generateAuthenticationOptions(
    userCredentials: PasskeyCredential[] = []
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials: userCredentials.map(cred => ({
        id: Buffer.from(cred.credentialId, 'base64url'),
        type: 'public-key',
        transports: cred.transports as any
      })),
      userVerification: 'required'
    });
    
    // Store challenge for verification
    const tempUserId = 'temp-' + randomBytes(16).toString('hex');
    this.storeChallenge(options.challenge, tempUserId);
    
    return options;
  }
  
  // Verify authentication response
  async verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: PasskeyCredential,
    expectedOrigin?: string,
    expectedRPID?: string
  ): Promise<{ verified: boolean; authenticationInfo?: any }> {
    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: expectedOrigin || this.origin,
        expectedRPID: expectedRPID || this.rpId,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64url'),
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: credential.counter
        },
        requireUserVerification: true
      });
      
      return verification;
    } catch (error) {
      console.error('Authentication verification failed:', error);
      return { verified: false };
    }
  }
  
  // Store challenge temporarily
  private storeChallenge(challenge: string, userId: string): void {
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.challenges.set(challenge, { challenge, userId, expires });
  }
  
  // Get stored challenge
  getChallenge(challenge: string): { challenge: string; userId: string } | null {
    const stored = this.challenges.get(challenge);
    if (!stored) return null;
    
    if (stored.expires < new Date()) {
      this.challenges.delete(challenge);
      return null;
    }
    
    return { challenge: stored.challenge, userId: stored.userId };
  }
  
  // Clean up expired challenges
  private cleanupChallenges(): void {
    const now = new Date();
    for (const [key, value] of this.challenges.entries()) {
      if (value.expires < now) {
        this.challenges.delete(key);
      }
    }
  }
  
  // Format credential for storage
  formatCredentialForStorage(
    userId: string,
    credentialId: string,
    publicKey: Buffer,
    counter: number,
    transports?: string[],
    name?: string
  ): Omit<PasskeyCredential, 'id' | 'createdAt' | 'lastUsedAt'> {
    return {
      userId,
      credentialId: Buffer.from(credentialId).toString('base64url'),
      publicKey: publicKey.toString('base64'),
      counter,
      transports,
      backedUp: false,
      name: name || 'Passkey'
    };
  }
  
  // Update credential counter after successful authentication
  updateCredentialCounter(credential: PasskeyCredential, newCounter: number): PasskeyCredential {
    return {
      ...credential,
      counter: newCounter,
      lastUsedAt: new Date()
    };
  }
}

export const webAuthnService = new WebAuthnService();