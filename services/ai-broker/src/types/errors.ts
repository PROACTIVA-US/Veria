export enum PolicyErrorCode {
  // Validation errors (400)
  INVALID_HEADERS = 'POLICY_ERR_INVALID_HEADERS',
  MISSING_SUBJECT = 'POLICY_ERR_MISSING_SUBJECT',
  INVALID_FORMAT = 'POLICY_ERR_INVALID_FORMAT',

  // Authorization errors (403)
  SUBJECT_FROZEN = 'POLICY_ERR_SUBJECT_FROZEN',
  ORG_FROZEN = 'POLICY_ERR_ORG_FROZEN',
  JURISDICTION_DENIED = 'POLICY_ERR_JURISDICTION_DENIED',
  CAPABILITY_DENIED = 'POLICY_ERR_CAPABILITY_DENIED',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'POLICY_ERR_RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'POLICY_ERR_QUOTA_EXCEEDED',

  // System errors (500)
  POLICY_LOAD_FAILED = 'POLICY_ERR_LOAD_FAILED',
  ENGINE_ERROR = 'POLICY_ERR_ENGINE_ERROR'
}

export interface PolicyError {
  code: PolicyErrorCode;
  message: string;
  details?: Record<string, any>;
}

export function createPolicyError(
  code: PolicyErrorCode,
  message: string,
  details?: Record<string, any>
): PolicyError {
  return { code, message, details };
}