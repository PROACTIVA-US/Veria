import crypto from 'crypto';
export function fingerprintPolicy(body: any): string {
  const json = JSON.stringify(body, (k, v) => v, 2);
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return hash;
}
