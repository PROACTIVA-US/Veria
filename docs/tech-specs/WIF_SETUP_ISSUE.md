# Workload Identity Federation Setup Issue

## Problem
The GitHub Actions workflows are failing with authentication errors because the Workload Identity Federation (WIF) provider resource hasn't been created in GCP.

## Root Cause
The Terraform configuration in `infra/ci/main.tf` defines:
- `google_iam_workload_identity_pool.github_pool` ✅ (exists)
- `google_iam_workload_identity_pool_provider.github_provider` ❌ (missing)

The provider resource was never created, causing the authentication error:
```
"invalid_target": "The target service indicated by the audience parameters is invalid"
```

## Solution

### Option 1: Apply Terraform (Recommended)
Someone with GCP credentials needs to:
```bash
cd infra/ci
gcloud auth login
terraform init
terraform apply
```

This will create the missing provider resource.

### Option 2: Create Provider Manually
Use gcloud CLI to create the provider:
```bash
gcloud iam workload-identity-pools providers create github-provider \
  --workload-identity-pool=github-pool \
  --location=global \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
  --project=veria-dev
```

### Option 3: Temporary Service Account Key
As a temporary workaround:
1. Create a service account key for `veria-deployer@veria-dev.iam.gserviceaccount.com`
2. Add it as a GitHub secret `GCP_SA_KEY`
3. Update workflows to use the key instead of WIF

## Current Status
- WIF Pool: ✅ Created
- WIF Provider: ❌ Missing
- Service Account: ✅ Created
- IAM Bindings: ✅ Created
- GitHub Secrets: ✅ Added (but won't work until provider exists)

## Verification
After fixing, verify with:
```bash
gcloud iam workload-identity-pools providers list \
  --workload-identity-pool=github-pool \
  --location=global \
  --project=veria-dev
```

Should show `github-provider` in the list.