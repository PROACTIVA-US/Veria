# GitHub OIDC (WIF) Deployment Configuration

This document describes the Workload Identity Federation (WIF) setup for GitHub Actions CD pipelines, enabling secure, keyless authentication to Google Cloud Platform.

## Overview

Our CI/CD pipeline uses GitHub's OIDC provider to authenticate with GCP through Workload Identity Federation, eliminating the need for JSON service account keys.

## Configuration Details

### GCP Project
- **Project ID**: `veria-dev`
- **Project Number**: `190356591245`
- **Region**: `us-central1`

### Workload Identity Pool
- **Pool Name**: `github-pool`
- **Location**: `global`
- **Pool ID**: `projects/190356591245/locations/global/workloadIdentityPools/github-pool`

### OIDC Provider
- **Provider Name**: `github-provider`
- **Provider Type**: OIDC
- **Issuer**: `https://token.actions.githubusercontent.com`
- **Provider Path**: `projects/190356591245/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

### Attribute Mappings
The following GitHub token attributes are mapped to Google attributes:
- `google.subject` → `assertion.sub`
- `attribute.repository` → `assertion.repository`
- `attribute.ref` → `assertion.ref`
- `attribute.actor` → `assertion.actor`
- `attribute.workflow_ref` → `assertion.workflow_ref`
- `attribute.aud` → `assertion.aud`

### Attribute Condition
The provider is configured with a condition to restrict access:
```
attribute.repository=="PROACTIVA-US/Veria" && (attribute.ref.startsWith("refs/heads/main") || attribute.ref.startsWith("refs/tags/"))
```

This ensures only workflows from:
- The `PROACTIVA-US/Veria` repository
- Running on the `main` branch OR release tags

can authenticate using this provider.

## Service Account Configuration

### CI/CD Service Account
- **Email**: `veria-automation@veria-dev.iam.gserviceaccount.com`
- **Purpose**: Used by GitHub Actions for CI/CD operations

### IAM Binding
The service account has the following principalSet binding:
```
Principal: principalSet://iam.googleapis.com/projects/190356591245/locations/global/workloadIdentityPools/github-pool/attribute.repository/PROACTIVA-US/Veria
Role: roles/iam.workloadIdentityUser
```

Note: The condition is applied at the provider level, not on the service account binding.

### Required Roles
The CI service account requires these minimal roles for deployment:
- `roles/run.admin` - Deploy and manage Cloud Run services
- `roles/iam.serviceAccountUser` - Impersonate service accounts for Cloud Run
- `roles/artifactregistry.writer` - Push Docker images to Artifact Registry

## GitHub Secrets Configuration

Set these secrets in your GitHub repository settings:

| Secret Name | Value |
|------------|-------|
| `GCP_PROJECT_ID` | `veria-dev` |
| `GCP_SA_EMAIL` | `veria-automation@veria-dev.iam.gserviceaccount.com` |
| `WORKLOAD_IDENTITY_PROVIDER` | `projects/190356591245/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

## Usage in GitHub Actions

### Example Workflow
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          workload_identity_provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      # Your deployment steps here
```

## Verification

### 1. Verify WIF Configuration
Run the verification script to check the setup:
```bash
cd infra/ci
./verify-wif.sh
```

### 2. Test OIDC Authentication
Trigger the OIDC smoketest workflow:
1. Go to Actions tab in GitHub
2. Select "OIDC Smoketest" workflow
3. Click "Run workflow"
4. Check the logs for successful authentication

### 3. Monitor Authentication
In GCP Log Explorer, verify the principal subject shows:
```
principalSet://iam.googleapis.com/projects/190356591245/locations/global/workloadIdentityPools/github-pool/attribute.repository/PROACTIVA-US/Veria
```

## Security Best Practices

1. **No JSON Keys**: Never store service account JSON keys in secrets or code
2. **Minimal Permissions**: Service account has only required roles
3. **Branch Protection**: Only main branch and tags can deploy
4. **Repository Restriction**: Only PROACTIVA-US/Veria repository can authenticate
5. **Audit Logging**: All deployments are traceable through GCP audit logs

## Rotation and Updates

### To Rotate Service Account
1. Create new service account in GCP
2. Grant required roles
3. Update IAM binding for WIF
4. Update GitHub secret `GCP_SA_EMAIL`
5. Test with OIDC smoketest workflow

### To Add Staging Environment
1. Create new WIF provider with different condition:
   ```
   attribute.repository=="PROACTIVA-US/Veria" && attribute.ref=="refs/heads/staging"
   ```
2. Create staging service account
3. Configure separate GitHub secrets for staging
4. Update workflows to use environment-specific secrets

## Troubleshooting

### Authentication Fails
1. Check GitHub secrets are set correctly
2. Verify WIF provider condition matches repository and branch
3. Ensure service account has workloadIdentityUser binding
4. Check workflow has `id-token: write` permission

### Permission Denied
1. Verify service account has required project-level roles
2. Check Cloud Run service account impersonation permissions
3. Ensure Artifact Registry permissions are granted

### Provider Not Found
1. Run `./create-wif-provider.sh` to create/update provider
2. Verify pool and provider names match secrets
3. Check project ID and number are correct

## Scripts

### create-wif-provider.sh
Creates or updates the WIF provider with proper OIDC configuration.

### verify-wif.sh
Validates the entire WIF setup including pool, provider, and IAM bindings.

## Related Documentation
- [Google Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub OIDC Token](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)