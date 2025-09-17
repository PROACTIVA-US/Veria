# Veria Infrastructure as Code (IaC) Operations Guide

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Terraform Operations](#terraform-operations)
  - [Initialization](#initialization)
  - [Development Environment](#development-environment)
  - [Staging Environment](#staging-environment)
  - [Production Environment](#production-environment)
- [Promotion Workflow](#promotion-workflow)
- [Module Documentation](#module-documentation)
- [Monitoring Infrastructure](#monitoring-infrastructure)
- [Rollback Procedures](#rollback-procedures)
- [Verification Commands](#verification-commands)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

## Overview

This guide provides comprehensive operations documentation for managing the Veria platform infrastructure using Terraform. The infrastructure implements a multi-environment deployment strategy across development, staging, and production environments with standardized Infrastructure as Code (IaC) practices.

**Key Infrastructure Components:**
- **Workload Identity Federation (WIF)**: Secure GitHub OIDC authentication
- **Cloud Run Services**: Serverless container orchestration for ai-broker service
- **Monitoring Infrastructure**: Logs-based metrics, alert policies, and dashboards
- **Artifact Registry**: Container image storage with retention policies
- **Security Controls**: Private-only access with ID-token authentication

**Critical Constraints:**
- ✅ **Authentication**: GitHub OIDC/WIF via `google-github-actions/auth@v2` only
- ✅ **Deployment**: Image digest-based deployments (never use `:latest` tags)
- ✅ **Access**: Private-only requiring ID-token authentication
- ✅ **Project**: `veria-dev` (190356591245), region: `us-central1`

## Quick Start

For experienced operators familiar with the infrastructure:

```bash
# Initialize and apply development environment
cd infra/terraform/envs/dev
terraform init
terraform plan -var-file="dev.auto.tfvars"
terraform apply -var-file="dev.auto.tfvars"

# Verify deployment
gcloud run services describe ai-broker --region=us-central1 --project=veria-dev

# Deploy monitoring infrastructure
cd ../../monitoring
terraform init
terraform apply
```

## Environment Setup

### Prerequisites

Ensure the following tools are installed and configured:

```bash
# Required versions
terraform --version  # >= 1.5.0
gcloud --version      # Latest stable
pnpm --version        # 10.x for CI/CD workflows
```

### Project Configuration

Set up your GCP project context:

```bash
# Set active project
gcloud config set project veria-dev

# Verify project access and APIs
gcloud services list --enabled --filter="name:run.googleapis.com OR name:artifactregistry.googleapis.com OR name:monitoring.googleapis.com"
```

### Authentication Setup

Configure authentication for Terraform operations:

```bash
# Application Default Credentials for local development
gcloud auth application-default login

# Verify WIF configuration (for CI/CD reference)
gcloud iam workload-identity-pools describe github-pool \
  --location=global \
  --project=veria-dev
```

## Terraform Operations

### Initialization

Initialize Terraform with remote backend for state management:

```bash
# Navigate to environment directory
cd infra/terraform/envs/{environment}

# Initialize with backend configuration
terraform init \
  -backend-config="bucket=veria-terraform-state" \
  -backend-config="prefix=envs/{environment}"

# Validate configuration
terraform validate
```

### Development Environment

**Location**: `infra/terraform/envs/dev/`

**Initialization and Planning:**
```bash
cd infra/terraform/envs/dev

# Initialize Terraform backend
terraform init \
  -backend-config="bucket=veria-terraform-state" \
  -backend-config="prefix=envs/dev"

# Create variable file from example
cp dev.auto.tfvars.example dev.auto.tfvars
# Edit dev.auto.tfvars with your specific values

# Generate execution plan
terraform plan \
  -var-file="dev.auto.tfvars" \
  -out=dev.plan

# Review the plan output carefully
terraform show dev.plan
```

**Apply Infrastructure:**
```bash
# Apply infrastructure changes
terraform apply dev.plan

# Or apply with automatic approval (use cautiously)
terraform apply \
  -var-file="dev.auto.tfvars" \
  -auto-approve
```

**Essential Variables for dev.auto.tfvars:**
```hcl
project_id = "veria-dev"
region = "us-central1"
environment = "dev"
repository = "PROACTIVA-US/Veria"
branch_condition = "refs/heads/main"
enable_cloud_run = false  # Set to true after container image exists
service_name = "ai-broker"
image_digest = ""  # Set after first image push
```

### Staging Environment

**Location**: `infra/terraform/envs/staging/`

**Initialization and Deployment:**
```bash
cd infra/terraform/envs/staging

# Initialize with staging-specific backend
terraform init \
  -backend-config="bucket=veria-terraform-state" \
  -backend-config="prefix=envs/staging"

# Create staging configuration
cp staging.auto.tfvars.example staging.auto.tfvars
# Configure staging-specific values

# Plan and apply staging infrastructure
terraform plan \
  -var-file="staging.auto.tfvars" \
  -out=staging.plan

terraform apply staging.plan
```

**Staging-Specific Configuration:**
```hcl
project_id = "veria-dev"  # Using same project, different resources
region = "us-central1"
environment = "staging"
repository = "PROACTIVA-US/Veria"
branch_condition = "refs/heads/staging"  # Critical: staging branch condition
enable_cloud_run = true
service_name = "ai-broker-staging"
image_digest = ""  # Promoted from development
```

### Production Environment

**Location**: `infra/terraform/envs/prod/`

⚠️ **Production deployments require additional safeguards and approvals.**

**Production Deployment Process:**
```bash
cd infra/terraform/envs/prod

# Initialize production backend with extra confirmation
terraform init \
  -backend-config="bucket=veria-terraform-state" \
  -backend-config="prefix=envs/prod"

# Generate detailed plan for review
terraform plan \
  -var-file="prod.auto.tfvars" \
  -detailed-exitcode \
  -out=prod.plan

# Production apply (requires manual confirmation)
echo "WARNING: Applying to PRODUCTION environment"
read -p "Confirm production deployment (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  terraform apply prod.plan
else
  echo "Production deployment cancelled"
  exit 1
fi
```

## Promotion Workflow

### Dev → Staging Promotion

1. **Verify Development Deployment:**
```bash
cd infra/terraform/envs/dev

# Get current development state
terraform output -json > dev-outputs.json

# Verify service health
gcloud run services describe ai-broker \
  --region=us-central1 \
  --project=veria-dev \
  --format="value(status.url)"
```

2. **Prepare Staging Environment:**
```bash
cd ../staging

# Update staging configuration with promoted image digest
IMAGE_DIGEST=$(cd ../dev && terraform output -raw current_image_digest)
echo "Promoting image digest: $IMAGE_DIGEST"

# Update staging.auto.tfvars
sed -i "s/image_digest = \".*\"/image_digest = \"$IMAGE_DIGEST\"/" staging.auto.tfvars
```

3. **Deploy to Staging:**
```bash
# Plan staging deployment
terraform plan \
  -var-file="staging.auto.tfvars" \
  -out=staging-promotion.plan

# Apply staging changes
terraform apply staging-promotion.plan

# Verify staging deployment
gcloud run services describe ai-broker-staging \
  --region=us-central1 \
  --project=veria-dev
```

### Staging → Production Promotion

1. **Staging Verification:**
```bash
cd infra/terraform/envs/staging

# Run smoke tests against staging
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  $(terraform output -raw service_url)/health

# Verify all tests pass before promoting
```

2. **Production Deployment:**
```bash
cd ../prod

# Update production configuration
STAGING_IMAGE_DIGEST=$(cd ../staging && terraform output -raw current_image_digest)
echo "Promoting to production: $STAGING_IMAGE_DIGEST"

# Update prod.auto.tfvars
sed -i "s/image_digest = \".*\"/image_digest = \"$STAGING_IMAGE_DIGEST\"/" prod.auto.tfvars

# Plan and apply production deployment
terraform plan -var-file="prod.auto.tfvars" -out=prod-promotion.plan
terraform apply prod-promotion.plan
```

## Module Documentation

### WIF Module (`modules/wif/`)

The Workload Identity Federation module provides secure GitHub OIDC authentication for CI/CD workflows.

**Module Usage:**
```hcl
module "wif" {
  source = "../../modules/wif"
  
  project_id         = var.project_id
  repository         = var.repository
  branch_condition   = var.branch_condition
  service_account_id = "veria-automation"
}
```

**Key Outputs:**
- `workload_identity_provider`: WIF provider resource name
- `service_account_email`: Generated service account email
- `github_repository`: Configured repository path

**Configuration Parameters:**
- `project_id`: GCP project ID (veria-dev)
- `repository`: GitHub repository (PROACTIVA-US/Veria)
- `branch_condition`: Git ref condition (`refs/heads/main`, `refs/heads/staging`)
- `service_account_id`: Service account identifier

### GCP CloudRun Module (`modules/gcp_cloudrun/`)

Manages Cloud Run service deployment with WIF integration and IAM bindings.

**Module Usage:**
```hcl
module "ai_broker_service" {
  source = "../../modules/gcp_cloudrun"
  
  project_id    = var.project_id
  region        = var.region
  service_name  = var.service_name
  image_digest  = var.image_digest
  environment   = var.environment
  
  # WIF integration
  workload_identity_service_account = module.wif.service_account_email
}
```

**IAM Configuration:**
The module automatically configures WorkloadIdentityUser bindings for GitHub Actions authentication.

### Artifact Registry Module (`modules/artifact-registry/`)

Manages container registry with retention policies and security controls.

**Retention Policy Configuration:**
```hcl
module "artifact_registry" {
  source = "../../modules/artifact-registry"
  
  project_id = var.project_id
  location   = var.region
  
  retention_policy = {
    development = "30d"    # 30 days for dev images
    staging     = "90d"    # 90 days for staging images  
    production  = "1y"     # 1 year for production images
  }
}
```

## Monitoring Infrastructure

### Metrics Configuration

**Location**: `infra/monitoring/metrics.tf`

Deploy logs-based metrics for Cloud Run services:

```bash
cd infra/monitoring

# Initialize monitoring infrastructure
terraform init \
  -backend-config="bucket=veria-terraform-state" \
  -backend-config="prefix=monitoring"

# Deploy metrics configuration
terraform apply
```

**Configured Metrics:**
- `veria/ai-broker/error_rate`: HTTP 5xx error percentage from Cloud Run logs
- `veria/ai-broker/p95_latency`: 95th percentile response latency from logs

### Alert Policies

**Location**: `infra/monitoring/alerts.tf`

**Alert Thresholds:**
- **Error Rate**: > 2% over 5 minutes (P2 High severity)
- **P95 Latency**: > 2000ms over 10 minutes (P3 Medium severity)

**Alert Deployment:**
```bash
cd infra/monitoring

# Validate alert configuration
terraform validate

# Apply alert policies
terraform apply -target=google_monitoring_alert_policy.error_rate
terraform apply -target=google_monitoring_alert_policy.latency
```

### Dashboard Configuration

**Location**: `infra/monitoring/dashboard.json`

Import the operational dashboard into Cloud Monitoring:

```bash
# Import dashboard via gcloud CLI
gcloud monitoring dashboards create \
  --config-from-file=infra/monitoring/dashboard.json \
  --project=veria-dev

# Or import via Console: Monitoring > Dashboards > Import
```

**Dashboard Features:**
- Real-time error rate visualization with threshold indicators
- P95 latency distribution charts with historical comparison
- Resource utilization panels for CPU, memory, network
- Alert status overview with severity classification

## Rollback Procedures

### Service Rollback

**Cloud Run Revision Rollback:**
```bash
# List available revisions
gcloud run revisions list \
  --service=ai-broker \
  --region=us-central1 \
  --project=veria-dev

# Rollback to previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=ai-broker \
  --region=us-central1 \
  --project=veria-dev \
  --format="value(name)" \
  --limit=2 | tail -1)

gcloud run services update-traffic ai-broker \
  --to-revisions=$PREVIOUS_REVISION=100 \
  --region=us-central1 \
  --project=veria-dev
```

### Infrastructure Rollback

**Terraform State Rollback:**
```bash
# List recent state versions
gsutil ls -l gs://veria-terraform-state/envs/dev/

# Backup current state
terraform state pull > current-state-backup.json

# Download previous state
gsutil cp gs://veria-terraform-state/envs/dev/terraform.tfstate.backup ./

# Rollback infrastructure (use with extreme caution)
terraform state push terraform.tfstate.backup

# Re-apply known good configuration
terraform apply -var-file="dev.auto.tfvars"
```

### Emergency Rollback

**Critical Service Failure Response:**
```bash
#!/bin/bash
# emergency-rollback.sh - Use only in critical situations

set -e

ENVIRONMENT=${1:-dev}
SERVICE=${2:-ai-broker}
PROJECT="veria-dev"
REGION="us-central1"

echo "EMERGENCY ROLLBACK: $SERVICE in $ENVIRONMENT"
echo "This will revert to the last known working revision"
read -p "Confirm emergency rollback (EMERGENCY/cancel): " confirm

if [ "$confirm" = "EMERGENCY" ]; then
  # Get second-to-last revision (last working)
  WORKING_REVISION=$(gcloud run revisions list \
    --service=$SERVICE \
    --region=$REGION \
    --project=$PROJECT \
    --format="value(name)" \
    --limit=2 | tail -1)
  
  # Immediate traffic switch
  gcloud run services update-traffic $SERVICE \
    --to-revisions=$WORKING_REVISION=100 \
    --region=$REGION \
    --project=$PROJECT
  
  echo "Emergency rollback complete to revision: $WORKING_REVISION"
  
  # Verify rollback
  gcloud run services describe $SERVICE \
    --region=$REGION \
    --project=$PROJECT \
    --format="value(status.traffic[0].revisionName,status.traffic[0].percent)"
else
  echo "Emergency rollback cancelled"
  exit 1
fi
```

## Verification Commands

### Infrastructure Verification

**Verify Terraform State:**
```bash
# Validate current configuration
terraform validate

# Check state consistency
terraform plan -detailed-exitcode

# Verify outputs match expected values
terraform output -json | jq '.'
```

**Verify GCP Resources:**
```bash
# Verify WIF configuration
gcloud iam workload-identity-pools describe github-pool \
  --location=global \
  --project=veria-dev

# Verify Cloud Run service
gcloud run services describe ai-broker \
  --region=us-central1 \
  --project=veria-dev \
  --format="yaml(spec.template.spec.containers[0].image,status.url,status.latestReadyRevisionName)"

# Verify IAM bindings
gcloud projects get-iam-policy veria-dev \
  --flatten="bindings[].members" \
  --filter="bindings.role=roles/iam.workloadIdentityUser"

# Verify monitoring metrics
gcloud logging metrics list --project=veria-dev \
  --filter="name:veria/ai-broker"

# Verify alert policies
gcloud alpha monitoring policies list --project=veria-dev \
  --filter="displayName:('Error Rate' OR 'P95 Latency')"
```

### Service Health Verification

**Health Check Endpoints:**
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe ai-broker \
  --region=us-central1 \
  --project=veria-dev \
  --format="value(status.url)")

# Health check with ID token authentication
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "$SERVICE_URL/health"

# Expected response: {"status":"ok","name":"ai-broker","ts":"<timestamp>"}
```

**Performance Verification:**
```bash
# Measure response time
time curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -s -o /dev/null -w "%{time_total}" \
  "$SERVICE_URL/health"

# Load test (basic)
for i in {1..10}; do
  curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
    -s -w "Response time: %{time_total}s\n" \
    -o /dev/null \
    "$SERVICE_URL/health"
done
```

### Monitoring Verification

**Verify Metrics Collection:**
```bash
# Check if metrics are collecting data
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-broker"' \
  --limit=5 \
  --project=veria-dev \
  --format="value(timestamp,httpRequest.status,httpRequest.latency)"

# Verify dashboard accessibility
echo "Import dashboard from: infra/monitoring/dashboard.json"
echo "Access at: https://console.cloud.google.com/monitoring/dashboards"
```

## Troubleshooting

### Common Issues

#### WIF Authentication Failures

**Symptoms:** GitHub Actions authentication errors, token exchange failures

**Diagnosis:**
```bash
# Verify WIF pool and provider exist
gcloud iam workload-identity-pools describe github-pool \
  --location=global \
  --project=veria-dev

# Check service account bindings
gcloud iam service-accounts get-iam-policy veria-automation@veria-dev.iam.gserviceaccount.com
```

**Resolution:**
```bash
# Re-apply WIF module
cd infra/terraform/envs/dev
terraform apply -target=module.wif

# Verify GitHub repository settings match
# Repository: PROACTIVA-US/Veria
# Branch condition: refs/heads/main (or refs/heads/staging)
```

#### Cloud Run Deployment Failures

**Symptoms:** Service deployment hangs, container fails to start

**Diagnosis:**
```bash
# Check service status
gcloud run services describe ai-broker \
  --region=us-central1 \
  --project=veria-dev \
  --format="value(status.conditions[].message)"

# View container logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-broker"' \
  --limit=50 \
  --project=veria-dev
```

**Resolution:**
```bash
# Verify container image exists
gcloud artifacts docker images list us-central1-docker.pkg.dev/veria-dev/veria/ai-broker

# Check image digest format
# Correct: us-central1-docker.pkg.dev/veria-dev/veria/ai-broker@sha256:abc123...
# Incorrect: us-central1-docker.pkg.dev/veria-dev/veria/ai-broker:latest

# Redeploy with correct image
terraform apply -var="image_digest=sha256:correct-digest-here"
```

#### Terraform State Issues

**Symptoms:** State drift, resource conflicts, locked state

**Diagnosis:**
```bash
# Check state lock
gsutil ls -l gs://veria-terraform-state/envs/dev/.terraform.tfstate.lock.info

# Validate state consistency
terraform plan -detailed-exitcode
```

**Resolution:**
```bash
# Clear state lock (if confirmed stale)
terraform force-unlock LOCK_ID

# Import drifted resources
terraform import google_cloud_run_service.ai_broker projects/veria-dev/locations/us-central1/services/ai-broker

# Refresh state from actual infrastructure
terraform refresh
```

#### Monitoring Metrics Not Collecting

**Symptoms:** No data in dashboards, missing metrics in Cloud Monitoring

**Diagnosis:**
```bash
# Verify metric definitions exist
gcloud logging metrics list --project=veria-dev

# Check log format compatibility
gcloud logging read 'resource.type="cloud_run_revision"' \
  --limit=1 \
  --project=veria-dev \
  --format="json"
```

**Resolution:**
```bash
# Redeploy monitoring infrastructure
cd infra/monitoring
terraform destroy -target=google_logging_metric.error_rate
terraform apply

# Verify log-based metrics configuration
gcloud logging metrics describe veria-ai-broker-error-rate --project=veria-dev
```

### Environment Variable Issues

**Required Environment Variables:**
```bash
# For Terraform operations
export GOOGLE_PROJECT=veria-dev
export GOOGLE_REGION=us-central1

# For gcloud CLI
gcloud config set project veria-dev
gcloud config set run/region us-central1

# Verify configuration
gcloud config list
```

### Secret Management Issues

**Secrets stored in Google Secret Manager:**
- `jwt-secret`: JWT signing key
- `database-url`: PostgreSQL connection string
- `redis-url`: Redis connection string

**Verify Secret Access:**
```bash
# List available secrets
gcloud secrets list --project=veria-dev

# Verify service account can access secrets
gcloud secrets versions access latest --secret=jwt-secret --project=veria-dev
```

## CI/CD Integration

### GitHub Actions Integration

The infrastructure supports automated deployment through GitHub Actions workflows with OIDC authentication.

**Required GitHub Secrets:**
- `GOOGLE_PROJECT_ID`: veria-dev
- `GOOGLE_WIF_PROVIDER`: projects/190356591245/locations/global/workloadIdentityPools/github-pool/providers/github-provider
- `GOOGLE_WIF_SERVICE_ACCOUNT`: veria-automation@veria-dev.iam.gserviceaccount.com

### Workflow Configuration

**Development Deployment (`.github/workflows/cd.yml`):**
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GOOGLE_WIF_PROVIDER }}
    service_account: ${{ secrets.GOOGLE_WIF_SERVICE_ACCOUNT }}

- name: Deploy Infrastructure
  run: |
    cd infra/terraform/envs/dev
    terraform init
    terraform apply -var-file="dev.auto.tfvars" -auto-approve
```

**Smoke Test Workflow (`.github/workflows/smoke-test.yml`):**
```yaml
name: Smoke Test
on:
  workflow_run:
    workflows: ["Deploy"]
    types: [completed]
    
jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GOOGLE_WIF_PROVIDER }}
          service_account: ${{ secrets.GOOGLE_WIF_SERVICE_ACCOUNT }}
          
      - name: Run Smoke Tests
        run: |
          SERVICE_URL=$(gcloud run services describe ai-broker \
            --region=us-central1 \
            --project=veria-dev \
            --format="value(status.url)")
          
          curl -f -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
            "$SERVICE_URL/health"
```

### Security Integration

**SBOM Generation and Vulnerability Scanning (`.github/workflows/ci.yml`):**
```yaml
- name: Generate SBOM
  run: trivy sbom --output sbom.spdx .

- name: Container Vulnerability Scan
  run: trivy fs --format sarif --output trivy-results.sarif .

- name: Upload SARIF to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: trivy-results.sarif
```

### Artifact Registry Integration

**Image Build and Push:**
```yaml
- name: Build and Push Container
  run: |
    # Build with build timestamp for traceability
    IMAGE_TAG="us-central1-docker.pkg.dev/veria-dev/veria/ai-broker:$(date +%Y%m%d%H%M%S)"
    docker build -t $IMAGE_TAG .
    docker push $IMAGE_TAG
    
    # Get image digest for immutable deployment
    IMAGE_DIGEST=$(docker inspect $IMAGE_TAG --format='{{index .RepoDigests 0}}' | cut -d'@' -f2)
    echo "IMAGE_DIGEST=$IMAGE_DIGEST" >> $GITHUB_ENV
```

---

## Run Report Template

After successful deployment, generate a run report with the following information:

```bash
#!/bin/bash
# generate-run-report.sh

ENVIRONMENT=${1:-dev}
PROJECT="veria-dev"
REGION="us-central1"
SERVICE="ai-broker"

echo "=== Veria Infrastructure Run Report ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Environment: $ENVIRONMENT"
echo ""

# Service URL
SERVICE_URL=$(gcloud run services describe $SERVICE \
  --region=$REGION \
  --project=$PROJECT \
  --format="value(status.url)")
echo "Service URL: $SERVICE_URL"

# Image Digest
IMAGE_DIGEST=$(gcloud run services describe $SERVICE \
  --region=$REGION \
  --project=$PROJECT \
  --format="value(spec.template.spec.containers[0].image)")
echo "Image Digest: $IMAGE_DIGEST"

# Latest Revision
LATEST_REVISION=$(gcloud run services describe $SERVICE \
  --region=$REGION \
  --project=$PROJECT \
  --format="value(status.latestReadyRevisionName)")
echo "Latest Revision: $LATEST_REVISION"

# Traffic Split
echo "Traffic Split:"
gcloud run services describe $SERVICE \
  --region=$REGION \
  --project=$PROJECT \
  --format="table(status.traffic[].revisionName,status.traffic[].percent)"

# Rollback Command
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=$SERVICE \
  --region=$REGION \
  --project=$PROJECT \
  --format="value(name)" \
  --limit=2 | tail -1)

echo ""
echo "Rollback Command:"
echo "gcloud run services update-traffic $SERVICE \\"
echo "  --to-revisions=$PREVIOUS_REVISION=100 \\"
echo "  --region=$REGION \\"
echo "  --project=$PROJECT"

echo ""
echo "=== End Run Report ==="
```

---

**Remember**: Always use image digests for production deployments, maintain private-only access, and verify OIDC authentication is working before deploying critical changes.

For additional support, refer to the project technical specification or contact the infrastructure team.