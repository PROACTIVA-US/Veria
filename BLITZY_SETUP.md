# Blitzy Setup - Veria OIDC/WIF Deployment

## Project Configuration

- **GCP Project**: veria-dev
- **Project Number**: 190356591245
- **Region**: us-central1
- **Monorepo Manager**: pnpm workspaces

## WIF (Workload Identity Federation) Setup

### Pool & Provider
- **WIF Pool**: github-pool (ACTIVE)
- **WIF Provider**: github-provider (ACTIVE)
- **Provider Condition**: `repository == "PROACTIVA-US/Veria" AND (ref startsWith "refs/heads/main" OR ref startsWith "refs/tags/")`

### Service Account
- **CI Service Account**: veria-automation@veria-dev.iam.gserviceaccount.com
- **Roles**:
  - roles/run.admin
  - roles/iam.serviceAccountUser
  - roles/artifactregistry.writer

### GitHub Secrets (Already Configured)
- `GCP_PROJECT_ID` = veria-dev
- `GCP_SA_EMAIL` = veria-automation@veria-dev.iam.gserviceaccount.com
- `WORKLOAD_IDENTITY_PROVIDER` = projects/190356591245/locations/global/workloadIdentityPools/github-pool/providers/github-provider

## Image Build & Deploy

### Artifact Registry
- **Repository**: us-central1-docker.pkg.dev/veria-dev/veria
- **Build Target**: linux/amd64
- **Deploy Method**: BY DIGEST ONLY (not :latest)

### Cloud Run Services
- **ai-broker**: AI suggestion service (port 4001)
- **veria-app**: Main application (port 8080)
- **veria-hello**: Hello world service (port 8080)

## Merge & Kick Steps (One-Screen Guide)

### 1. Merge PR
```bash
# Check PR status
gh pr status

# Merge (if checks pass or with admin override)
gh pr merge <PR_NUMBER> --squash --delete-branch
```

### 2. Trigger CD
Option A - Push to main (automatic on merge):
```bash
git checkout main
git pull origin main
# CD triggers automatically
```

Option B - Create release tag:
```bash
git tag -a v0.1.2 -m "Release: your description"
git push origin v0.1.2
```

### 3. Verify Deployment
```bash
# Set project
gcloud config set project veria-dev

# Check service status
gcloud run services describe ai-broker \
  --region=us-central1 \
  --format='yaml(status.url,status.latestReadyRevisionName,status.traffic)'

# Get service URL
SERVICE_URL=$(gcloud run services describe ai-broker \
  --region=us-central1 \
  --format='value(status.url)')
echo "Service URL: $SERVICE_URL"
```

### 4. Smoke Test (if public)
```bash
# Health check
curl -sSf "$SERVICE_URL/health" || echo "Service is private or unavailable"

# API test (if public)
curl -sSf -X POST "$SERVICE_URL/ai/graph/suggest" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test","provider":"local"}' || echo "Service is private"
```

### 5. Rollback (if needed)
```bash
# List revisions
gcloud run revisions list \
  --service=ai-broker \
  --region=us-central1 \
  --format='table(name,traffic)'

# Rollback to previous revision (replace REVISION_NAME)
gcloud run services update-traffic ai-broker \
  --region=us-central1 \
  --to-revisions=REVISION_NAME=100
```

## CI/CD Workflows

### Main CD Workflow
- **File**: `.github/workflows/cd.yml`
- **Triggers**: push to main, tags v*.*.*
- **Auth**: google-github-actions/auth@v2 with OIDC/WIF
- **Build**: Docker buildx for linux/amd64
- **Deploy**: Cloud Run by digest

### OIDC Smoketest
- **File**: `.github/workflows/oidc-smoketest.yml`
- **Purpose**: Verify WIF authentication works
- **Trigger**: manual (workflow_dispatch)

## Monitoring

### Cloud Logging
```
# Log Explorer filter for ai-broker
resource.type="cloud_run_revision"
AND resource.labels.service_name="ai-broker"
AND timestamp >= "2025-01-01T00:00:00Z"
```

### GitHub Actions
- View runs: `gh run list --workflow=cd.yml`
- Watch run: `gh run watch <RUN_ID>`
- View logs: `gh run view <RUN_ID> --log`

## Access Control

### Private Service (Default)
Services are private by default. To test with authentication:
```bash
SERVICE_URL=$(gcloud run services describe ai-broker --region=us-central1 --format='value(status.url)')
ID_TOKEN=$(gcloud auth print-identity-token --audiences="$SERVICE_URL")
curl -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/health"
```

### Make Service Public (Optional)
```bash
gcloud run services add-iam-policy-binding ai-broker \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### Revoke Public Access
```bash
gcloud run services remove-iam-policy-binding ai-broker \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

## Troubleshooting

### Authentication Issues
1. Verify secrets: `gh secret list`
2. Run OIDC smoketest: `gh workflow run oidc-smoketest.yml`
3. Check WIF provider: `cd infra/ci && ./verify-wif.sh`

### Build Failures
1. Check individual service: `pnpm --filter ai-broker build`
2. Run tests: `pnpm --filter ai-broker test`
3. TypeScript check: `pnpm --filter ai-broker typecheck`

### Deployment Issues
1. Check IAM: Service account needs roles/run.admin
2. Verify image digest in Cloud Run console
3. Check Cloud Run logs in Log Explorer

## Notes
- **OIDC/WIF Only**: No JSON keys used anywhere
- **Deploy by Digest**: All deployments use image digest, not tags
- **Branch Protection**: main branch can be overridden with admin
- **Auth**: Workload Identity Federation via GitHub OIDC tokens
- **Monorepo**: Some services may have build issues; deploy individually if needed