export type Provenance = {
  reqId: string;
  subject: string;
  org: string;
  policyHash: string;
  decision: 'ALLOW' | 'DENY';
  ts: number;
};
