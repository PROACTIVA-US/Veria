import crypto from 'crypto';

export interface CachedDecision {
  decision: 'ALLOW' | 'DENY';
  reason?: string;
  timestamp: number;
  ttl: number;
}

export class DecisionCache {
  private cache: Map<string, CachedDecision> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 5000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private generateKey(params: {
    subject: string;
    org: string;
    jurisdiction: string;
    endpoint?: string;
  }): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  get(params: {
    subject: string;
    org: string;
    jurisdiction: string;
    endpoint?: string;
  }): CachedDecision | null {
    const key = this.generateKey(params);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(
    params: {
      subject: string;
      org: string;
      jurisdiction: string;
      endpoint?: string;
    },
    decision: 'ALLOW' | 'DENY',
    reason?: string,
    ttl?: number
  ): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const key = this.generateKey(params);
    this.cache.set(key, {
      decision,
      reason,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.timestamp + value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // For testing and monitoring
  size(): number {
    return this.cache.size;
  }
}