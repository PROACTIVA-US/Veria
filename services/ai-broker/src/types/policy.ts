export type PolicyRuleset = {
  version: string;
  jurisdictions: Record<string, { allow: boolean }>;
  quotas?: Record<string, { rps: number; burst: number }>;
  redaction?: { fields: string[]; rules?: any[] };
  denyList?: string[];
  obligations?: string[];
};

export type PolicyDecision = {
  reqId: string;
  subject: string;
  org: string;
  policyHash: string;
  decision: 'ALLOW' | 'DENY';
};
