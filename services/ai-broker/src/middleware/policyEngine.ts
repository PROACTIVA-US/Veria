// Lightweight Policy Engine middleware (MVP)
import { Request, Response, NextFunction } from 'express';
import { PolicyRuleset, PolicyDecision } from '../types/policy';
import crypto from 'crypto';

export type PolicyLoader = () => Promise<PolicyRuleset>;

export function policyEngine(load: PolicyLoader) {
  return async function(req: Request, res: Response, next: NextFunction) {
    const policy = await load();
    const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    (req as any)._reqId = reqId;

    const subject = String(req.headers['x-veria-subject'] || 'subject:unknown');
    const org = String(req.headers['x-veria-org'] || 'org:unknown');
    const juris = String(req.headers['x-veria-jurisdiction'] || 'US');

    // deny-list
    if (policy.denyList?.includes(subject)) {
      attachProvenance(res, reqId, subject, org, policy.version, 'DENY');
      res.status(403).json({ error: 'frozen' }); return;
    }

    // jurisdiction
    const allowJ = policy.jurisdictions?.[juris]?.allow === true;
    if (!allowJ) {
      attachProvenance(res, reqId, subject, org, policy.version, 'DENY');
      res.status(403).json({ error: 'jurisdiction' }); return;
    }

    // TODO: quotas/rate-limit integration
    // TODO: field-level redaction

    attachProvenance(res, reqId, subject, org, policy.version, 'ALLOW');
    (req as any)._provenance = { reqId, subject, org, policyHash: policy.version, decision: 'ALLOW' } as PolicyDecision;
    next();
  }
}

function attachProvenance(res: Response, reqId: string, subject: string, org: string, version: string, decision: 'ALLOW'|'DENY') {
  const prov = JSON.stringify({ reqId, subject, org, policyHash: version, decision, ts: Date.now() });
  res.setHeader('X-Veria-Provenance', prov);
}
