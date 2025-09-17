// Enhanced Policy Engine middleware with metrics and caching
import { Request, Response, NextFunction } from 'express';
import { PolicyRuleset, PolicyDecision } from '../types/policy.js';
import { PolicyErrorCode, createPolicyError } from '../types/errors.js';
import { metrics } from '../utils/metrics.js';
import { DecisionCache } from '../utils/decisionCache.js';
import crypto from 'crypto';

export { PolicyRuleset } from '../types/policy.js';

export type PolicyLoader = () => Promise<PolicyRuleset>;

// Rate limiting state (in-memory for MVP)
const rateLimitState = new Map<string, { count: number; resetTime: number }>();

// Decision cache for identical requests
const decisionCache = new DecisionCache(1000, 5000); // 1000 entries, 5 second TTL

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
    metrics.counter('policy.rate_limit.exceeded', 1, { key });
    return false; // Rate limit exceeded
  }

  state.count++;
  return true;
}

export function policyEngine(load: PolicyLoader) {
  return async function(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    try {
      const policy = await load();
      const reqId = sanitizeHeader(req.headers['x-request-id']) || crypto.randomUUID();
      (req as any)._reqId = reqId;

      // Validate and sanitize headers
      const subject = sanitizeHeader(req.headers['x-veria-subject']) || 'subject:unknown';
      const org = sanitizeHeader(req.headers['x-veria-org']) || 'org:unknown';
      const juris = sanitizeHeader(req.headers['x-veria-jurisdiction']) || 'US';

      // Validate input format
      if (!/^[a-zA-Z0-9:_\-.]+$/.test(subject) || !/^[a-zA-Z0-9:_\-.]+$/.test(org)) {
        const error = createPolicyError(
          PolicyErrorCode.INVALID_HEADERS,
          'Invalid header format',
          { subject, org }
        );
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY', 'invalid_headers');
        metrics.counter('policy.decision', 1, { decision: 'DENY', reason: 'invalid_headers' });
        metrics.histogram('policy.decision.latency', Date.now() - startTime);
        return res.status(400).json(error);
      }

      // Check decision cache
      const cacheParams = { subject, org, jurisdiction: juris, endpoint: req.originalUrl };
      const cachedDecision = decisionCache.get(cacheParams);

      if (cachedDecision) {
        metrics.counter('policy.cache.hit', 1);

        if (cachedDecision.decision === 'DENY') {
          attachProvenance(res, reqId, subject, org, policy.version, 'DENY', cachedDecision.reason);
          metrics.counter('policy.decision', 1, { decision: 'DENY', reason: cachedDecision.reason || 'unknown', cached: true });
          metrics.histogram('policy.decision.latency', Date.now() - startTime);

          const statusCode = cachedDecision.reason === 'rate_limit_exceeded' ? 429 : 403;
          return res.status(statusCode).json({
            code: cachedDecision.reason,
            message: 'Policy denied request (cached)',
            cached: true
          });
        }
      } else {
        metrics.counter('policy.cache.miss', 1);
      }

      // Check deny-list for subject
      if (policy.denyList?.includes(subject)) {
        const error = createPolicyError(
          PolicyErrorCode.SUBJECT_FROZEN,
          'Subject is frozen',
          { subject }
        );
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY', 'subject_frozen');
        decisionCache.set(cacheParams, 'DENY', 'subject_frozen', 60000); // Cache for 1 minute
        metrics.counter('policy.decision', 1, { decision: 'DENY', reason: 'subject_frozen' });
        metrics.histogram('policy.decision.latency', Date.now() - startTime);
        return res.status(403).json(error);
      }

      // Check deny-list for org
      if (policy.denyList?.includes(org)) {
        const error = createPolicyError(
          PolicyErrorCode.ORG_FROZEN,
          'Organization is frozen',
          { org }
        );
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY', 'org_frozen');
        decisionCache.set(cacheParams, 'DENY', 'org_frozen', 60000); // Cache for 1 minute
        metrics.counter('policy.decision', 1, { decision: 'DENY', reason: 'org_frozen' });
        metrics.histogram('policy.decision.latency', Date.now() - startTime);
        return res.status(403).json(error);
      }

      // Check jurisdiction
      const allowJ = policy.jurisdictions?.[juris]?.allow === true;
      if (!allowJ) {
        const error = createPolicyError(
          PolicyErrorCode.JURISDICTION_DENIED,
          'Jurisdiction not allowed',
          { jurisdiction: juris }
        );
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY', 'jurisdiction');
        decisionCache.set(cacheParams, 'DENY', 'jurisdiction', 300000); // Cache for 5 minutes
        metrics.counter('policy.decision', 1, { decision: 'DENY', reason: 'jurisdiction', jurisdiction: juris });
        metrics.histogram('policy.decision.latency', Date.now() - startTime);
        return res.status(403).json(error);
      }

      // Rate limiting
      const quotaKey = policy.quotas?.[`org:${org}`] ? `org:${org}` : 'default';
      const quota = policy.quotas?.[quotaKey] || { rps: 5, burst: 10 };

      if (!checkRateLimit(`${org}:${subject}`, quota.rps, quota.burst)) {
        const error = createPolicyError(
          PolicyErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          { quota: quota.burst, window: '1s' }
        );
        attachProvenance(res, reqId, subject, org, policy.version, 'DENY', 'rate_limit_exceeded');
        decisionCache.set(cacheParams, 'DENY', 'rate_limit_exceeded', 1000); // Cache for 1 second
        res.setHeader('X-RateLimit-Limit', String(quota.burst));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('Retry-After', '1');
        metrics.counter('policy.decision', 1, { decision: 'DENY', reason: 'rate_limit' });
        metrics.histogram('policy.decision.latency', Date.now() - startTime);
        return res.status(429).json(error);
      }

      // Field redaction setup (applied later in response)
      if (policy.redaction?.fields && policy.redaction.fields.length > 0) {
        (req as any)._redactionRules = policy.redaction;
      }

      // Success - cache the decision
      attachProvenance(res, reqId, subject, org, policy.version, 'ALLOW');
      decisionCache.set(cacheParams, 'ALLOW');

      (req as any)._provenance = {
        reqId,
        subject,
        org,
        policyHash: policy.version,
        decision: 'ALLOW'
      } as PolicyDecision;

      metrics.counter('policy.decision', 1, { decision: 'ALLOW', jurisdiction: juris });
      metrics.histogram('policy.decision.latency', Date.now() - startTime);

      next();
    } catch (error) {
      console.error('Policy engine error:', error);
      metrics.counter('policy.engine.error', 1);
      metrics.histogram('policy.decision.latency', Date.now() - startTime);

      const policyError = createPolicyError(
        PolicyErrorCode.ENGINE_ERROR,
        'Policy engine internal error',
        { error: (error as Error).message }
      );

      return res.status(500).json(policyError);
    }
  };
}

function attachProvenance(
  res: Response,
  reqId: string,
  subject: string,
  org: string,
  version: string,
  decision: 'ALLOW' | 'DENY',
  reason?: string
) {
  const prov = JSON.stringify({
    reqId,
    subject,
    org,
    policyHash: version,
    decision,
    reason,
    ts: Date.now()
  });
  res.setHeader('X-Veria-Provenance', prov);
}