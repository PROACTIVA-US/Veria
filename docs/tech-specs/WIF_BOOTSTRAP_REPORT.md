# WIF Bootstrap Report - GCP Platform Engineer

## Executive Summary
Workload Identity Federation (WIF) infrastructure has been prepared but requires manual execution to complete. The blocking issue preventing CD pipeline execution has been identified and resolution scripts provided.

## Current State

### ✅ Completed
1. **Terraform Configuration Updated**
   - Added API enablement for 6 required services
   - Enhanced WIF provider with workflow_ref attribute
   - Added proper dependencies between resources

2. **GitHub Secrets Configured**
   - `GCP_WIF_PROVIDER`: Set to expected value
   - `GCP_WIF_SERVICE_ACCOUNT`: Set to veria-deployer@veria-dev.iam.gserviceaccount.com

3. **Manual Setup Scripts Created**
   - `/infra/ci/apply-wif.sh`: Full Terraform apply with API enablement
   - `/infra/ci/create-wif-provider.sh`: Direct gcloud command to create provider

### ❌ Blocked - Requires Manual Intervention
1. **WIF Provider Creation**
   - Resource `google_iam_workload_identity_pool_provider.github_provider` doesn't exist
   - This is the root cause of authentication failures

## Infrastructure Details

### Project Configuration
- **Project ID**: veria-dev
- **Project Number**: 190356591245
- **Region**: us-central1
- **Repository**: PROACTIVA-US/Veria

### WIF Resources Status
| Resource | Status | Path/ID |
|----------|--------|---------|
| WIF Pool | ✅ Exists | `projects/veria-dev/locations/global/workloadIdentityPools/github-pool` |
| WIF Provider | ❌ Missing | `projects/190356591245/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| Service Account | ✅ Exists | `veria-deployer@veria-dev.iam.gserviceaccount.com` |
| IAM Binding | ✅ Exists | PrincipalSet configured for PROACTIVA-US/Veria |

### Required APIs
The following APIs need to be enabled (included in Terraform):
- iam.googleapis.com
- iamcredentials.googleapis.com
- sts.googleapis.com
- artifactregistry.googleapis.com
- run.googleapis.com
- cloudbuild.googleapis.com

## Manual Steps Required

### Option 1: Apply Terraform (Recommended)
```bash
# Authenticate with GCP
gcloud auth login
gcloud config set project veria-dev

# Apply configuration
cd infra/ci
./apply-wif.sh
```

### Option 2: Create Provider Only
```bash
# Quick fix - just create the missing provider
cd infra/ci
./create-wif-provider.sh
```

### Option 3: Manual gcloud Commands
```bash
# Enable APIs
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com artifactregistry.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com --project=veria-dev

# Create provider
gcloud iam workload-identity-pools providers create github-provider \
  --project=veria-dev \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.workflow_ref=assertion.workflow_ref,attribute.ref=assertion.ref,attribute.actor=assertion.actor"
```

## Verification Steps

After running the manual steps:

1. **Verify Provider Exists**
```bash
gcloud iam workload-identity-pools providers list \
  --workload-identity-pool=github-pool \
  --location=global \
  --project=veria-dev
```

2. **Trigger Workflow**
```bash
# From main branch after merging PR #6
gh workflow run investor-app.yml --ref main
```

3. **Check Deployment**
```bash
gcloud run services list --project=veria-dev --region=us-central1
```

## Expected Outcomes

Once the WIF provider is created:
1. ✅ GitHub Actions will authenticate successfully
2. ✅ Docker images will build and push to Artifact Registry
3. ✅ Cloud Run will deploy veria-investor-staging service
4. ✅ Staging environment will have FEATURE_INVESTOR_PORTAL=true
5. ✅ Production will remain with FEATURE_INVESTOR_PORTAL=false

## PR Status
- **PR #6**: https://github.com/PROACTIVA-US/Veria/pull/6
- **Branch**: ci/wif-bootstrap
- **Status**: Ready for review, pending manual WIF provider creation

## Risk Assessment
- **Low Risk**: Changes only affect CI/CD authentication
- **No Production Impact**: Feature flag remains OFF in production
- **Rollback**: Can revert to service account keys if needed

## Next Actions
1. ⚠️ **URGENT**: Someone with GCP credentials must run one of the setup scripts
2. Review and merge PR #6
3. Monitor workflow execution
4. Verify staging deployment
5. Test investor portal on staging URL

---
*Report Generated: 2024-12-15*
*Role: GCP Platform Engineer*
*Objective: Bootstrap WIF for GitHub Actions CD*