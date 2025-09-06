import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
  IDENTITY_URL: z.string().url().default('http://localhost:3002'),
  POLICY_URL: z.string().url().default('http://localhost:3003'),
  COMPLIANCE_URL: z.string().url().default('http://localhost:3004'),
  AUDIT_URL: z.string().url().default('http://localhost:3005'),
  CORS_ORIGINS: z.string().optional() // comma-separated
});

export function getConfig(env = process.env) {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error('Invalid gateway env: ' + JSON.stringify(parsed.error.issues));
  }
  const cfg = parsed.data;
  const origins = cfg.CORS_ORIGINS ? cfg.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : true;
  return { ...cfg, origins };
}
