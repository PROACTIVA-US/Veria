// Lightweight Policy Engine middleware (MVP)
import { Request, Response, NextFunction } from 'express';
import { PolicyRuleset, PolicyDecision } from '../types/policy.js';
import crypto from 'crypto';

export { PolicyRuleset } from '../types/policy.js';

export type PolicyLoader = () => Promise<PolicyRuleset>;

// Rate limiting state (in-memory for MVP)
const rateLimitState = new Map<string, { count: number; resetTime: number }>();

function sanitizeHeader(value: unknown): string {
  if (!value) return '';
  const str = String(value).trim();
  // Remove any control characters and limit length
  return str.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 256);
}

function checkRateLimit(key: string, rps: number, burst: number): boolean {
  const now = Date.now();
  const window = 1000; // 1 second window

  let state = rateLimitState.get(key);
  if (!state || now > state.resetTime) {
    state = { count: 0, resetTime: now + window };
    rateLimitState.set(key, state);
  }

  if (state.count >= burst) {
    return false; // Rate limit exceeded
  }

  state.count++;
  return true;
}

export function policyEngine(load: PolicyLoader) {
  return async function(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await load();
      const reqId = sanitizeHeader(req.headers['x-request-id']) || crypto.randomUUID();
      (req as any)._reqId = reqId;

      // Validate and sanitize headers
      const subject = sanitizeHeader(req.headers['x-veria-subject']) || 'subject:unknown';
      const org = sanitizeHeader(req.headers['x-veria-org']) || 'org:unknown';
      const juris = sanitizeHeader(req.headers['x-veria-jurisdiction']) || 'US';

      // Validate input format
      if (!/^[a-zA-Z0-9:_-]+$/.test(subject) || !/^[a-zA-Z0-9:_-]+$/.test(org)) {
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY');
        return res.status(400).json({ error: 'invalid_headers' });
      }

      // Check deny-list
      if (policy.denyList?.includes(subject) || policy.denyList?.includes(org)) {
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY');
        return res.status(403).json({ error: 'frozen' });
      }

      // Check jurisdiction
      const allowJ = policy.jurisdictions?.[juris]?.allow === true;
      if (!allowJ) {
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY');
        return res.status(403).json({ error: 'jurisdiction' });
      }

      // Rate limiting
      const quotaKey = policy.quotas?.[`org:${org}`] ? `org:${org}` : 'default';
      const quota = policy.quotas?.[quotaKey] || { rps: 5, burst: 10 };

      if (!checkRateLimit(`${org}:${subject}`, quota.rps, quota.burst)) {
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY');
        res.setHeader('X-RateLimit-Limit', String(quota.burst));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('Retry-After', '1');
        return res.status(429).json({ error: 'rate_limit_exceeded' });
      }

      // Field redaction setup (applied later in response)
      if (policy.redaction?.fields && policy.redaction.fields.length > 0) {
        (req as any)._redactionRules = policy.redaction;
      }

      attachProvenance(res, reqId, subject, org, policy.version, 'ALLOW');
      (req as any)._provenance = {
        reqId,
        subject,
        org,
        policyHash: policy.version,
        decision: 'ALLOW'
      } as PolicyDecision;

      next();
    } catch (error) {
      console.error('Policy engine error:', error);
      return res.status(500).json({ error: 'policy_engine_error' });
    }
  };
}

function attachProvenance(res: Response, reqId: string, subject: string, org: string, version: string, decision: 'ALLOW'|'DENY') {
  const prov = JSON.stringify({
    reqId,
    subject,
    org,
    policyHash: version,
    decision,
    ts: Date.now()
  });
  res.setHeader('X-Veria-Provenance', prov);
}