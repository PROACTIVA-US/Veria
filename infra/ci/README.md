# CI Infrastructure - Workload Identity Federation

This directory contains Terraform configuration for GitHub Actions Workload Identity Federation (WIF).

## Components
- **Pool**: `github-pool` - Workload Identity Pool for GitHub Actions
- **Provider**: `github-provider` - OIDC provider trusting token.actions.githubusercontent.com
- **Service Account**: `veria-deployer@veria-dev.iam.gserviceaccount.com` - Deployment service account

## GitHub Secrets Required
After applying this Terraform, create these GitHub repository secrets:
- `GCP_WIF_PROVIDER`: Get from `terraform output workload_identity_provider`
- `GCP_WIF_SERVICE_ACCOUNT`: Get from `terraform output service_account_email`

## Apply
```bash
terraform init
terraform apply
```