import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.string().default('3004'),
  HOST: z.string().default('0.0.0.0')
});

export function getConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) throw new Error('Invalid env for compliance-service');
  return parsed.data;
}
