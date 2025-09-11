import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';

export interface Session {
  id: string;
  userId: string;
  email: string;
  roles: string[];
  organizationId?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB || 0),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    
    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    this.redis.on('connect', () => {
      console.log('Connected to Redis for session management');
    });
  }
  
  async createSession(data: Omit<Session, 'id' | 'createdAt' | 'lastAccessedAt' | 'expiresAt'>): Promise<Session> {
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);
    
    const session: Session = {
      id: sessionId,
      ...data,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt
    };
    
    // Store session in Redis
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.setex(
      sessionKey,
      SESSION_TTL,
      JSON.stringify(session)
    );
    
    // Add session to user's session list
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${data.userId}`;
    await this.redis.sadd(userSessionsKey, sessionId);
    await this.redis.expire(userSessionsKey, SESSION_TTL);
    
    return session;
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const data = await this.redis.get(sessionKey);
    
    if (!data) {
      return null;
    }
    
    const session = JSON.parse(data) as Session;
    
    // Update last accessed time
    session.lastAccessedAt = new Date();
    await this.redis.setex(
      sessionKey,
      SESSION_TTL,
      JSON.stringify(session)
    );
    
    return session;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      // Remove from user's session list
      const userSessionsKey = `${USER_SESSIONS_PREFIX}${session.userId}`;
      await this.redis.srem(userSessionsKey, sessionId);
    }
    
    // Delete the session
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.del(sessionKey);
  }
  
  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);
    
    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }
  
  async deleteUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      await this.deleteSession(session.id);
    }
    
    // Clean up user sessions set
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    await this.redis.del(userSessionsKey);
  }
  
  async refreshSession(sessionId: string): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    
    // Extend session expiry
    const now = new Date();
    session.lastAccessedAt = now;
    session.expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);
    
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.setex(
      sessionKey,
      SESSION_TTL,
      JSON.stringify(session)
    );
    
    return session;
  }
  
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }
    
    const now = new Date();
    return session.expiresAt > now;
  }
  
  async cleanup(): Promise<void> {
    // Redis automatically expires keys, but we can do additional cleanup if needed
    console.log('Session cleanup completed');
  }
  
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export const sessionManager = new SessionManager();