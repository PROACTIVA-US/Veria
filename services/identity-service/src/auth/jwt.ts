import jwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export const JWTPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  roles: z.array(z.string()),
  organizationId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  iat: z.number(),
  exp: z.number()
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export async function setupJWT(app: FastifyInstance) {
  const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production';
  
  await app.register(jwt, {
    secret: {
      private: JWT_SECRET,
      public: JWT_SECRET
    },
    sign: {
      algorithm: 'HS256',
      expiresIn: '15m' // Access token expires in 15 minutes
    }
  });

  // Add refresh token capability
  app.decorate('jwtRefresh', {
    sign: (payload: any) => {
      return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: '7d' // Refresh token expires in 7 days
      });
    },
    verify: (token: string) => {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    }
  });
}

export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>, app: FastifyInstance) {
  const accessToken = app.jwt.sign(payload);
  const refreshToken = (app as any).jwtRefresh.sign({ 
    userId: payload.userId,
    sessionId: payload.sessionId 
  });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
    tokenType: 'Bearer'
  };
}

export async function verifyAccessToken(token: string, app: FastifyInstance): Promise<JWTPayload> {
  const decoded = await app.jwt.verify(token);
  return JWTPayloadSchema.parse(decoded);
}

export async function verifyRefreshToken(token: string, app: FastifyInstance): Promise<{ userId: string; sessionId: string }> {
  const decoded = await (app as any).jwtRefresh.verify(token);
  return {
    userId: decoded.userId,
    sessionId: decoded.sessionId
  };
}