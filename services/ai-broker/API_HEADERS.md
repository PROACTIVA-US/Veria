# AI Broker API Header Requirements

## Required Headers for Policy Engine

The following headers are required for all requests to the AI Broker service:

### `X-Veria-Subject`
- **Purpose**: Identifies the calling subject (user or automated agent)
- **Format**: `<type>:<identifier>` (e.g., `user:123`, `agent:bot-456`)
- **Validation**: Must match pattern `^[a-zA-Z0-9:_\-.]+$`
- **Default**: `subject:unknown` (will have limited access)

### `X-Veria-Org`
- **Purpose**: Identifies the organization context
- **Format**: `org:<identifier>` (e.g., `org:acme`, `org:premium-corp`)
- **Validation**: Must match pattern `^[a-zA-Z0-9:_\-.]+$`
- **Default**: `org:unknown` (will have limited access)

### `X-Veria-Jurisdiction` (Optional)
- **Purpose**: Specifies the legal jurisdiction for compliance
- **Format**: ISO country code or jurisdiction identifier (e.g., `US`, `EU`, `UK`)
- **Default**: `US`
- **Note**: Some jurisdictions may be blocked (e.g., OFAC sanctioned countries)

### `X-Request-Id` (Optional)
- **Purpose**: Unique identifier for request tracing
- **Format**: UUID v4 recommended
- **Default**: Auto-generated if not provided

## Response Headers

### `X-Veria-Provenance`
- **Purpose**: Audit trail for policy decisions
- **Format**: JSON object containing:
  - `reqId`: Request identifier
  - `subject`: Subject from request
  - `org`: Organization from request
  - `policyHash`: Version of policy applied
  - `decision`: `ALLOW` or `DENY`
  - `reason`: (Optional) Denial reason
  - `ts`: Timestamp

### Rate Limiting Headers (when applicable)
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `Retry-After`: Seconds to wait before retrying (on 429 responses)

## Error Response Format

All policy-related errors follow this structure:

```json
{
  "code": "POLICY_ERR_<ERROR_TYPE>",
  "message": "Human-readable error message",
  "details": {
    // Additional context (optional)
  }
}
```

## Error Codes

### 400 Bad Request
- `POLICY_ERR_INVALID_HEADERS`: Headers contain invalid characters
- `POLICY_ERR_MISSING_SUBJECT`: Required subject header missing
- `POLICY_ERR_INVALID_FORMAT`: Header format invalid

### 403 Forbidden
- `POLICY_ERR_SUBJECT_FROZEN`: Subject has been frozen
- `POLICY_ERR_ORG_FROZEN`: Organization has been frozen
- `POLICY_ERR_JURISDICTION_DENIED`: Jurisdiction not allowed
- `POLICY_ERR_CAPABILITY_DENIED`: Requested capability not permitted

### 429 Too Many Requests
- `POLICY_ERR_RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `POLICY_ERR_QUOTA_EXCEEDED`: Organization quota exceeded

### 500 Internal Server Error
- `POLICY_ERR_LOAD_FAILED`: Policy loading failed
- `POLICY_ERR_ENGINE_ERROR`: Policy engine internal error

## Example Request

```bash
curl -X POST https://api.veria.com/ai/graph/suggest \
  -H "Content-Type: application/json" \
  -H "X-Veria-Subject: user:alice-123" \
  -H "X-Veria-Org: org:acme-corp" \
  -H "X-Veria-Jurisdiction: US" \
  -H "X-Request-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"prompt": "Create investment graph"}'
```

## Migration Guide for Existing Clients

1. **Add Required Headers**: Update your API clients to include `X-Veria-Subject` and `X-Veria-Org`
2. **Handle New Error Codes**: Update error handling to recognize structured policy error codes
3. **Monitor Rate Limits**: Implement exponential backoff when receiving 429 responses
4. **Log Provenance**: Store `X-Veria-Provenance` headers for audit trails

## Testing

Test your integration using these example headers:

```javascript
// Valid test headers
{
  'X-Veria-Subject': 'user:test-user',
  'X-Veria-Org': 'org:test-org',
  'X-Veria-Jurisdiction': 'US'
}

// Premium org with higher quotas
{
  'X-Veria-Subject': 'user:premium-user',
  'X-Veria-Org': 'org:acme',  // Has higher rate limits in policy
  'X-Veria-Jurisdiction': 'US'
}
```