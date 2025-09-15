# Feature Flags Documentation

## Overview
Feature flags allow controlled rollout of new functionality across different environments. Flags can be enabled/disabled without code changes, reducing deployment risk and enabling gradual feature adoption.

## Available Feature Flags

### FEATURE_INVESTOR_PORTAL
**Default:** `false`
**Type:** Boolean
**Description:** Enables the read-only Investor/Client Portal interface
**Status:** Preview (not production-ready)

#### Behavior
- **When `false` (default):**
  - No investor portal navigation items appear
  - `/api/investor/*` endpoints return 404
  - `apps/investor` app routes are not accessible

- **When `true`:**
  - "Investor Portal (Preview)" navigation item appears
  - Read-only portfolio, KYC status, and statements pages are accessible
  - `/api/investor/*` endpoints return mocked data
  - Preview banner displayed: "Preview — Not for production fund flows"

## Environment Configuration

### Development
```bash
# .env.development
FEATURE_INVESTOR_PORTAL=true  # Enable for local testing
```

### Staging
```bash
# Enabled via Cloud Run environment variable
FEATURE_INVESTOR_PORTAL=true  # Enable for staging demos
```

### Production
```bash
# Cloud Run manifest / Terraform vars
FEATURE_INVESTOR_PORTAL=false  # Keep OFF until Phase 2
```

## Implementation Pattern

### Frontend (Next.js)
```typescript
// lib/features.ts
export const isInvestorPortalEnabled = () => {
  return process.env.FEATURE_INVESTOR_PORTAL === 'true';
};

// components/Navigation.tsx
{isInvestorPortalEnabled() && (
  <NavLink href="/investor">
    Investor Portal (Preview)
  </NavLink>
)}
```

### Backend (API Gateway)
```typescript
// middleware/features.ts
if (!isFeatureEnabled('INVESTOR_PORTAL')) {
  return res.status(404).json({ error: 'Feature not available' });
}
```

## Rollout Strategy

### Phase 1: Development (Current)
- Flag OFF by default in all environments
- Enable locally for development and testing
- No production exposure

### Phase 2: Staging Preview
1. Enable flag in staging environment only
2. Run smoke tests with flag enabled
3. Validate all read-only endpoints
4. Collect feedback from internal review

### Phase 3: Production Rollout (Future)
1. Enable for select beta users (via user-level flags)
2. Monitor metrics and error rates
3. Gradual percentage rollout
4. Full production enablement

## Rollback Procedure

### Immediate Rollback
```bash
# Set environment variable in Cloud Run
gcloud run services update veria-investor \
  --update-env-vars FEATURE_INVESTOR_PORTAL=false \
  --region us-central1
```

### Verification
```bash
# Verify flag is disabled
curl https://api.veria.app/api/investor/portfolio
# Expected: 404 Not Found
```

## Monitoring

### Key Metrics
- Feature adoption rate (when enabled)
- Error rates on `/api/investor/*` endpoints
- Page load times for investor portal routes
- User session duration in portal

### Alerts
- Alert if error rate > 5% when feature is enabled
- Alert if response time > 2s for portfolio endpoint
- Daily report of feature flag status across environments

## Testing

### Unit Tests
```typescript
describe('Feature Flags', () => {
  it('should hide investor portal when flag is false', () => {
    process.env.FEATURE_INVESTOR_PORTAL = 'false';
    expect(isInvestorPortalEnabled()).toBe(false);
  });
});
```

### E2E Tests
```typescript
// Run in CI with flag enabled
test('investor portal accessible when enabled', async () => {
  process.env.FEATURE_INVESTOR_PORTAL = 'true';
  await page.goto('/investor');
  await expect(page).toHaveTitle(/Investor Portal/);
});
```

## Best Practices

1. **Default to OFF:** New features should default to disabled
2. **Environment-specific:** Never hardcode flag values
3. **Clean removal:** Remove flag code once feature is stable
4. **Documentation:** Update this file when adding new flags
5. **Testing:** Test both enabled and disabled states
6. **Monitoring:** Track flag changes in audit logs

## Flag Lifecycle

1. **Introduction:** Add flag (OFF by default)
2. **Testing:** Enable in dev/staging
3. **Rollout:** Gradual production enablement
4. **Stabilization:** Monitor for 30 days
5. **Cleanup:** Remove flag code once stable

## Related Documentation
- [Portal Stub Documentation](./portal-stub.md)
- [Staging Rollout Runbook](./runbooks/staging-rollout.md)
- [CI/CD Pipeline](./ci-cd.md)