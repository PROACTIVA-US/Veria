# Staging Rollout Runbook - Investor Portal

## Overview
This runbook provides step-by-step instructions for enabling and testing the Investor Portal feature in staging environment.

## Prerequisites
- GCP access with Cloud Run Admin role
- GitHub repository access
- Access to staging monitoring dashboards

## Rollout Steps

### 1. Pre-Deployment Checklist
- [ ] Confirm main branch build is green
- [ ] Review PR for any breaking changes
- [ ] Check staging environment health
- [ ] Notify team of rollout via Slack

### 2. Enable Feature Flag in Staging

#### Via Cloud Console
```bash
# Set environment variable
gcloud run services update veria-investor-staging \
  --update-env-vars FEATURE_INVESTOR_PORTAL=true \
  --region us-central1 \
  --project veria-staging
```

#### Via Terraform (Recommended)
```hcl
# In infra/staging/terraform.tfvars
feature_flags = {
  investor_portal = true
}
```

Apply changes:
```bash
cd infra/staging
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

### 3. Deploy Latest Image

```bash
# Get latest image tag
IMAGE_TAG=$(gcloud container images list-tags \
  us-central1-docker.pkg.dev/veria-staging/veria/veria-investor \
  --format="get(tags[0])" \
  --limit=1)

# Deploy to staging
gcloud run deploy veria-investor-staging \
  --image us-central1-docker.pkg.dev/veria-staging/veria/veria-investor:${IMAGE_TAG} \
  --region us-central1 \
  --project veria-staging
```

### 4. Verify Deployment

#### Health Checks
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe veria-investor-staging \
  --region us-central1 \
  --project veria-staging \
  --format 'value(status.url)')

# Check health endpoint
curl -f ${SERVICE_URL}/api/health

# Expected output:
# {"status":"healthy","service":"investor","environment":"staging"}
```

#### Feature Flag Verification
```bash
# Check portal is accessible
curl -f ${SERVICE_URL}

# Check API endpoints
curl -f ${SERVICE_URL}/api/investor/portfolio \
  -H "Authorization: Bearer ${TEST_JWT_TOKEN}"
```

### 5. Smoke Tests

Run automated smoke tests:
```bash
cd tests/e2e
INVESTOR_PORTAL_URL=${SERVICE_URL} \
FEATURE_INVESTOR_PORTAL=true \
npm run test:smoke:investor
```

Manual testing checklist:
- [ ] Login page loads
- [ ] Portfolio page displays mock data
- [ ] KYC status shows pending
- [ ] Statements page lists items
- [ ] Transfer form is disabled
- [ ] Preview banner is visible

### 6. Monitor Deployment

Check metrics dashboard:
- Error rate < 1%
- Response time p95 < 1s
- Memory usage < 80%
- No crash loops

Monitor logs:
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=veria-investor-staging \
  AND severity>=ERROR" \
  --limit 50 \
  --project veria-staging
```

## Rollback Procedure

### Immediate Rollback (Feature Flag)
```bash
# Disable feature flag
gcloud run services update veria-investor-staging \
  --update-env-vars FEATURE_INVESTOR_PORTAL=false \
  --region us-central1 \
  --project veria-staging

# Verify portal is disabled
curl ${SERVICE_URL}/api/investor/portfolio
# Expected: 404 Not Found
```

### Full Rollback (Previous Version)
```bash
# List available revisions
gcloud run revisions list \
  --service veria-investor-staging \
  --region us-central1 \
  --project veria-staging

# Route traffic to previous revision
gcloud run services update-traffic veria-investor-staging \
  --to-revisions PREVIOUS_REVISION=100 \
  --region us-central1 \
  --project veria-staging
```

## Validation Tests

### API Contract Tests
```bash
# Run contract tests
cd tests/contract
npm run test:investor-api
```

### Load Testing (Optional)
```bash
# Run light load test
artillery run tests/load/investor-portal.yml \
  --target ${SERVICE_URL}
```

## Post-Rollout Tasks

1. **Update Documentation**
   - [ ] Update staging environment notes
   - [ ] Document any issues encountered
   - [ ] Update test results

2. **Communicate Status**
   - [ ] Post in #platform-updates channel
   - [ ] Update JIRA ticket status
   - [ ] Email stakeholders if needed

3. **Schedule Review**
   - [ ] Book demo session with product team
   - [ ] Collect feedback from QA team
   - [ ] Plan production rollout timeline

## Troubleshooting

### Portal Not Loading
```bash
# Check service status
gcloud run services describe veria-investor-staging \
  --region us-central1 \
  --project veria-staging

# Check recent deployments
gcloud run revisions list \
  --service veria-investor-staging \
  --region us-central1 \
  --limit 5
```

### Authentication Issues
```bash
# Verify JWT secret is set
gcloud secrets versions access latest \
  --secret jwt-secret \
  --project veria-staging

# Test with new token
node scripts/generate-test-token.js
```

### Performance Issues
```bash
# Check instance scaling
gcloud run services describe veria-investor-staging \
  --format="get(spec.template.metadata.annotations)" \
  --region us-central1

# Adjust if needed
gcloud run services update veria-investor-staging \
  --min-instances 1 \
  --max-instances 20 \
  --region us-central1
```

## Emergency Contacts

- **Platform Team Lead**: platform-lead@veria.app
- **On-Call Engineer**: Check PagerDuty
- **Slack Channel**: #platform-incidents
- **GCP Support**: [Console Support](https://console.cloud.google.com/support)

## Appendix

### Test JWT Token Generation
```javascript
// scripts/generate-test-token.js
const jwt = require('jsonwebtoken');

const payload = {
  id: 'test-user-123',
  email: 'test@veria.app',
  role: 'investor',
  orgId: 'org-123',
  scopes: ['portfolio:read', 'kyc:read', 'statements:read'],
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
};

const token = jwt.sign(payload, process.env.JWT_SECRET || 'staging-secret');
console.log(token);
```

### Monitoring Queries

**Error Rate:**
```sql
SELECT
  COUNT(*) as errors,
  resource.labels.service_name
FROM `veria-staging.cloud_run_logs.run_googleapis_com_requests`
WHERE
  resource.labels.service_name = "veria-investor-staging"
  AND httpRequest.status >= 500
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY resource.labels.service_name
```

**Response Times:**
```sql
SELECT
  APPROX_QUANTILES(httpRequest.latency, 100)[OFFSET(50)] as p50,
  APPROX_QUANTILES(httpRequest.latency, 100)[OFFSET(95)] as p95,
  APPROX_QUANTILES(httpRequest.latency, 100)[OFFSET(99)] as p99
FROM `veria-staging.cloud_run_logs.run_googleapis_com_requests`
WHERE
  resource.labels.service_name = "veria-investor-staging"
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
```