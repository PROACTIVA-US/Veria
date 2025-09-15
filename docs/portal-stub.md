# Investor Portal Stub Documentation

## Overview
The Investor Portal is a read-only web interface for investors and clients to view their portfolios, KYC status, and account statements. It's currently feature-flagged OFF by default and should only be enabled in staging for testing.

## Architecture

### Components
- **Frontend App**: Next.js 14 App Router (`apps/investor`)
- **API Routes**: Gateway namespace (`/api/investor/*`)
- **Types Package**: Shared DTOs (`packages/types-investor`)
- **Auth Middleware**: JWT-based with RBAC

### Tech Stack
- Frontend: Next.js, React, TypeScript, Tailwind CSS, Radix UI
- Backend: Express gateway with JWT auth
- Deployment: Cloud Run with feature flags

## Routes and Pages

### Frontend Routes
- `/` - Portfolio overview (positions, cash, NAV)
- `/kyc` - KYC verification status
- `/statements` - Account statements list
- `/transfers` - Transfer request form (disabled)
- `/auth/login` - Authentication page

### API Endpoints

#### GET /api/investor/portfolio
Returns portfolio summary with positions and NAV.

**Response:**
```json
{
  "positions": [
    {
      "symbol": "AAPL",
      "quantity": 100,
      "price": 175.50,
      "value": 17550
    }
  ],
  "cash": {
    "currency": "USD",
    "amount": 25000
  },
  "nav": 81706.25,
  "asOf": "2024-01-15T10:30:00Z"
}
```

#### GET /api/investor/kyc
Returns KYC verification status.

**Response:**
```json
{
  "status": "pending",
  "provider": "mock",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### GET /api/investor/statements
Returns list of account statements.

**Response:**
```json
[
  {
    "id": "1",
    "period": "2024 Q4",
    "url": null
  },
  {
    "id": "2",
    "period": "2024 Q3",
    "url": "/statements/2024-q3.pdf"
  }
]
```

#### POST /api/investor/transfers/request
Creates a transfer request (flag-gated, returns 202).

**Request:**
```json
{
  "amount": {
    "currency": "USD",
    "amount": 10000
  },
  "direction": "deposit",
  "accountId": "acc_123",
  "notes": "Monthly investment"
}
```

**Response (202 Accepted):**
```json
{
  "requestId": "req_1234567890",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Authentication & Authorization

### JWT Claims
```typescript
{
  id: string;
  email: string;
  role: 'investor' | 'client' | 'admin';
  orgId: string;
  scopes: string[];
}
```

### Required Scopes
- `portfolio:read` - View portfolio data
- `kyc:read` - View KYC status
- `statements:read` - View account statements
- `transfers:write` - Submit transfer requests

### RBAC Matrix
| Role     | Portfolio | KYC | Statements | Transfers |
|----------|-----------|-----|------------|-----------|
| investor | ✅        | ✅  | ✅         | ✅        |
| client   | ✅        | ✅  | ✅         | ✅        |
| admin    | ✅        | ✅  | ✅         | ✅        |

## Feature Flag Behavior

### When FEATURE_INVESTOR_PORTAL = false (default)
- Portal routes return 404
- API endpoints return 404
- No navigation items shown
- App displays "Feature Not Available"

### When FEATURE_INVESTOR_PORTAL = true
- Portal is accessible
- Preview banner displayed
- API endpoints return mock data
- Transfer requests are accepted but not processed

## Mocked Data

All data is currently mocked for Phase 1:

### Portfolio Data
- 4 sample positions (AAPL, GOOGL, MSFT, AMZN)
- $25,000 cash balance
- NAV calculated from positions + cash

### KYC Status
- Always returns "pending" status
- Provider is "mock"

### Statements
- 4 quarterly statements
- Q4 shows as processing (url: null)
- Q1-Q3 have mock URLs

## Deployment

### Environment Variables
```bash
# Required
NODE_ENV=production|staging|development
FEATURE_INVESTOR_PORTAL=true|false
NEXT_PUBLIC_API_URL=https://api.veria.app
JWT_SECRET=<secret>

# Optional
SENTRY_DSN=<dsn>
DATADOG_API_KEY=<key>
```

### Cloud Run Configuration
- Service: `veria-investor`
- Port: 3002
- Memory: 512Mi (min 256Mi)
- CPU: 1 (min 0.25)
- Min instances: 0
- Max instances: 10

### Health Checks
- Liveness: `/api/health` (30s interval)
- Readiness: `/api/health` (10s interval)

## Testing

### Local Development
```bash
# Install dependencies
pnpm install

# Run dev server with flag enabled
FEATURE_INVESTOR_PORTAL=true pnpm --filter @veria/investor dev

# Access at http://localhost:3002
```

### Staging Testing
1. Flag is enabled by default in staging
2. Access at: `https://veria-investor-staging-<hash>.run.app`
3. Use mock JWT token for auth testing

### E2E Test Coverage
- [ ] Portal loads with flag enabled
- [ ] 404 returned with flag disabled
- [ ] Portfolio page renders data
- [ ] KYC status displays correctly
- [ ] Statements list shows items
- [ ] Transfer form is disabled
- [ ] Auth flow works with mock token

## Monitoring

### Metrics Exposed
- HTTP request counts by endpoint
- Response times (p50, p95, p99)
- Error rates by status code
- Active user sessions

### Logging
- Structured JSON logs
- Correlation IDs for request tracing
- Audit logs for data access
- No PII in log payloads

### Alerts
- Error rate > 5%
- Response time > 2s (p95)
- Memory usage > 80%
- Pod restarts > 3/hour

## Security Considerations

1. **Authentication**: All routes require valid JWT
2. **Authorization**: Scope-based access control
3. **Data Privacy**: No PII in logs or metrics
4. **Rate Limiting**: Applied at gateway level
5. **CORS**: Configured for allowed origins only
6. **Headers**: Security headers (CSP, HSTS, etc.)

## Phase 2 Roadmap

Future enhancements when flag is enabled in production:

1. **Real Data Integration**
   - Connect to actual portfolio service
   - Integrate with KYC provider (Sumsub/Onfido)
   - Generate real account statements

2. **Enhanced Features**
   - Transaction history
   - Performance analytics
   - Document upload for KYC
   - Two-factor authentication

3. **Mobile Optimization**
   - Progressive Web App
   - Push notifications
   - Biometric authentication

## Troubleshooting

### Common Issues

1. **Portal shows "Feature Not Available"**
   - Check `FEATURE_INVESTOR_PORTAL` env var
   - Verify deployment completed successfully

2. **API returns 404**
   - Ensure feature flag is enabled
   - Check gateway routing configuration

3. **Authentication fails**
   - Verify JWT_SECRET matches across services
   - Check token expiration
   - Validate scopes in token

4. **Slow performance**
   - Check Cloud Run scaling settings
   - Monitor memory usage
   - Review database query performance

## Support

For issues or questions:
- Create issue in GitHub repo
- Contact: platform-team@veria.app
- Slack: #veria-platform-support