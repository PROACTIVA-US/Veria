export type EvalInput = {
  jurisdiction?: string;
  accredited?: boolean;
  sanctionsHit?: boolean;
  amountUsd?: number;
};

export type EvalResult = {
  outcome: 'allow' | 'deny' | 'review';
  reasons: string[];
};

export function evaluate(policy: any, input: EvalInput): EvalResult {
  const reasons: string[] = [];
  // Sanctions
  const reqSanctions = policy?.requirements?.sanctions;
  if (reqSanctions === 'none' && input.sanctionsHit) {
    reasons.push('Sanctions hit present but policy requires none');
    return { outcome: 'deny', reasons };
  }

  // Accreditation
  const accReq = policy?.requirements?.accreditation?.required;
  if (accReq && !input.accredited) {
    reasons.push('Accreditation required but not present');
    return { outcome: 'deny', reasons };
  }

  // Jurisdiction
  const allowed = policy?.transfer_controls?.allowed_jurisdictions;
  if (Array.isArray(allowed) && input.jurisdiction && !allowed.includes(input.jurisdiction)) {
    reasons.push(`Jurisdiction ${input.jurisdiction} not allowed`);
    return { outcome: 'deny', reasons };
  }

  // Limits (stateless check vs requested amount)
  const perTx = policy?.limits?.per_investor_usd_total; // placeholder: treat as hard cap
  if (perTx && input.amountUsd && input.amountUsd > perTx) {
    reasons.push(`Amount ${input.amountUsd} exceeds per-investor total limit ${perTx}`);
    return { outcome: 'deny', reasons };
  }

  if (reasons.length === 0) reasons.push('All checks passed');
  return { outcome: 'allow', reasons };
}
