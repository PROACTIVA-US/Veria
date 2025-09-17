# Staging Environment

## Overview

The staging environment serves as a production-like testing environment that closely mirrors the production configuration while targeting the `refs/heads/staging` branch. This environment utilizes the same infrastructure components as production but with staging-specific configurations and reduced resource allocation for cost optimization.

**Key Staging Environment Characteristics:**
- **Branch Target**: `refs/heads/staging` (required for WIF authentication)
- **GCP Project**: `veria-dev` (Project Number: 190356591245)
- **Region**: `us-central1`
- **Service**: `ai-broker` (staging variant)
- **Authentication**: GitHub OIDC/Workload Identity Federation (WIF)
- **Deployment**: Image digest-based (never use `:latest` tags)
- **Access Policy**: Private-only with ID-token authentication

## Prerequisites

### Required Tools
- Terraform >= 1.5.0
- gcloud CLI >= 400.0.0
- git (for branch validation)
- curl (for smoke testing)

### Required Access
- GitHub repository access with staging branch permissions
- GCP IAM permissions for Workload Identity Federation management
- Cloud Run and Artifact Registry permissions in `veria-dev` project

### Required Branch Setup
**CRITICAL**: The staging environment ONLY works with the `refs/heads/staging` branch condition. Ensure you are working from the staging branch before deployment:

```bash
# Verify current branch
git branch --show-current

# Switch to staging branch if needed
git checkout staging

# Verify WIF provider condition alignment
gcloud iam workload-identity-pools providers describe github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --project=veria-dev \
  --format="value(attributeCondition)"
# Should include: assertion.repository=="PROACTIVA-US/Veria" && assertion.ref=="refs/heads/staging"
```

## Environment Setup

### Step 1: Initialize Terraform Configuration

Create the staging-specific Terraform variables file:

```bash
cd infra/terraform/envs/staging
cp staging.auto.tfvars.example staging.auto.tfvars
```

Edit `staging.auto.tfvars` with staging-specific values:

```hcl
# staging.auto.tfvars
project_id = "veria-dev"
project_number = "190356591245"
region = "us-central1"
environment = "staging"

# WIF Configuration - MUST target refs/heads/staging
repository = "PROACTIVA-US/Veria"
branch_condition = "refs/heads/staging"
wif_pool_id = "github-pool-staging"
wif_provider_id = "github-provider-staging"

# Service Configuration
service_name = "ai-broker-staging"
enable_cloud_run = false  # Set to true ONLY after container image exists

# Scaling Configuration (reduced from production)
min_instances = 0
max_instances = 3
cpu_limit = "1000m"
memory_limit = "512Mi"
concurrency = 100
```

### Step 2: Terraform Initialization and Validation

Initialize the Terraform workspace:

```bash
cd infra/terraform/envs/staging

# Initialize Terraform backend
terraform init

# Validate configuration
terraform validate

# Generate and review plan
terraform plan -out=staging.tfplan

# Review the plan carefully, ensuring:
# - WIF pool/provider target refs/heads/staging
# - Service account bindings are correct
# - Resource names include 'staging' prefix
# - Resource allocation matches staging requirements
```

### Step 3: Infrastructure Deployment

Deploy the base infrastructure (without Cloud Run service initially):

```bash
# Apply base infrastructure
terraform apply staging.tfplan

# Verify infrastructure deployment
terraform output
```

Expected outputs:
```
artifact_registry_url = "us-central1-docker.pkg.dev/veria-dev/veria"
wif_provider_name = "projects/190356591245/locations/global/workloadIdentityPools/github-pool-staging/providers/github-provider-staging"
service_account_email = "veria-automation-staging@veria-dev.iam.gserviceaccount.com"
cloud_run_service_url = "" # Empty until service is deployed
```

## Workload Identity Federation (WIF) Configuration

### WIF Authentication Setup

The staging environment uses a dedicated WIF pool and provider specifically configured for the `refs/heads/staging` branch condition. This ensures that only deployments from the staging branch can authenticate to the staging environment.

**WIF Component Architecture:**
```
projects/190356591245/locations/global/workloadIdentityPools/github-pool-staging
├── providers/github-provider-staging
│   ├── condition: assertion.repository=="PROACTIVA-US/Veria" && assertion.ref=="refs/heads/staging"
│   ├── issuer: https://token.actions.githubusercontent.com
│   └── audiences: https://github.com/PROACTIVA-US
└── service-account: veria-automation-staging@veria-dev.iam.gserviceaccount.com
    └── workloadIdentityUser binding to principalSet://iam.googleapis.com/projects/190356591245/locations/global/workloadIdentityPools/github-pool-staging/attribute.repository/PROACTIVA-US/Veria
```

### WIF Validation Commands

Verify WIF configuration after infrastructure deployment:

```bash
# 1. Verify WIF pool exists
gcloud iam workload-identity-pools describe github-pool-staging \
  --location=global \
  --project=veria-dev

# 2. Verify WIF provider and branch condition
gcloud iam workload-identity-pools providers describe github-provider-staging \
  --location=global \
  --workload-identity-pool=github-pool-staging \
  --project=veria-dev \
  --format="yaml(attributeCondition,issuer)"

# Expected output should include:
# attributeCondition: assertion.repository=="PROACTIVA-US/Veria" && assertion.ref=="refs/heads/staging"
# issuer: https://token.actions.githubusercontent.com

# 3. Verify service account binding
gcloud projects get-iam-policy veria-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:principalSet://iam.googleapis.com/projects/190356591245/locations/global/workloadIdentityPools/github-pool-staging/*" \
  --format="table(bindings.role,bindings.members)"

# 4. Test WIF authentication (from GitHub Actions staging workflow)
# This command only works within GitHub Actions with proper OIDC token
gcloud auth print-identity-token --audiences=https://github.com/PROACTIVA-US
```

## Container Image and Service Deployment

### Step 1: Verify Container Image Exists

Before enabling Cloud Run, ensure a container image exists in Artifact Registry:

```bash
# List available images
gcloud container images list --repository=us-central1-docker.pkg.dev/veria-dev/veria

# Get specific image digest (required for immutable deployment)
gcloud container images list-tags us-central1-docker.pkg.dev/veria-dev/veria/ai-broker \
  --format="table(digest,tags,timestamp)" \
  --sort-by=~timestamp \
  --limit=5

# Example output:
# DIGEST                                                                  TAGS      TIMESTAMP
# sha256:abc123def456...                                                   staging   2024-01-15T10:30:45
```

### Step 2: Enable Cloud Run Service

Once a container image is available, update the Terraform configuration:

```bash
# Edit staging.auto.tfvars
# Set: enable_cloud_run = true

# Plan and apply the service deployment
terraform plan -out=staging-service.tfplan
terraform apply staging-service.tfplan
```

### Step 3: Deploy Service with Image Digest

Deploy the service using the exact image digest (REQUIRED for production compliance):

```bash
# Get the latest image digest
IMAGE_DIGEST=$(gcloud container images list-tags us-central1-docker.pkg.dev/veria-dev/veria/ai-broker \
  --format="value(digest)" \
  --sort-by=~timestamp \
  --limit=1)

# Deploy service with digest (immutable deployment)
gcloud run deploy ai-broker-staging \
  --image="us-central1-docker.pkg.dev/veria-dev/veria/ai-broker@${IMAGE_DIGEST}" \
  --platform=managed \
  --region=us-central1 \
  --project=veria-dev \
  --port=4000 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=100 \
  --ingress=all \
  --allow-unauthenticated=false \
  --set-env-vars="LOG_LEVEL=info,ENVIRONMENT=staging"

# Verify deployment
gcloud run services describe ai-broker-staging \
  --platform=managed \
  --region=us-central1 \
  --project=veria-dev \
  --format="yaml(status.url,status.latestCreatedRevisionName,status.traffic)"
```

## CI/CD Pipeline Integration

### GitHub Actions Staging Workflow

The staging environment integrates with GitHub Actions through the existing CI/CD pipeline with staging-specific configuration. Ensure the following workflow configuration exists in `.github/workflows/cd.yml`:

```yaml
# Staging deployment configuration (excerpt)
staging-deploy:
  if: github.ref == 'refs/heads/staging'
  runs-on: ubuntu-latest
  permissions:
    contents: read
    id-token: write
  
  steps:
    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        workload_identity_provider: projects/190356591245/locations/global/workloadIdentityPools/github-pool-staging/providers/github-provider-staging
        service_account: veria-automation-staging@veria-dev.iam.gserviceaccount.com
        token_format: 'access_token'
    
    - name: Deploy to Cloud Run Staging
      run: |
        gcloud run deploy ai-broker-staging \
          --image us-central1-docker.pkg.dev/veria-dev/veria/ai-broker@$IMAGE_DIGEST \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated=false
```

### Staging Deployment Triggers

Deployments to staging are triggered by:
- **Pull Requests to staging**: Integration validation pipeline
- **Pushes to refs/heads/staging**: Automated staging deployment
- **Manual workflow dispatch**: On-demand staging deployment for testing

### Post-Deployment Validation

After successful deployment, automated smoke tests validate the staging environment:

```bash
# Get service URL for validation
SERVICE_URL=$(gcloud run services describe ai-broker-staging \
  --platform=managed \
  --region=us-central1 \
  --project=veria-dev \
  --format="value(status.url)")

echo "Staging Service URL: $SERVICE_URL"

# The smoke-test.yml workflow will automatically validate:
# - Health endpoint accessibility with ID-token authentication
# - Service response times and error rates
# - Basic functionality verification
```

## Validation and Testing

### Health Check Validation

Validate staging service health and functionality:

```bash
# Get ID token for authenticated requests (requires gcloud auth)
ID_TOKEN=$(gcloud auth print-identity-token --audiences=$SERVICE_URL)

# Health check validation
curl -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVICE_URL/health" \
  -w "\nResponse Time: %{time_total}s\nStatus: %{http_code}\n"

# Expected response:
# {"status":"ok","name":"ai-broker-staging","ts":"2024-01-15T10:30:45.123Z"}
# Response Time: 0.145s
# Status: 200
```

### Integration Testing

Run staging-specific integration tests:

```bash
# Validate WIF authentication works from CI/CD
# This simulates the GitHub Actions authentication flow
echo "Testing WIF authentication from staging branch context..."

# Validate service discovery and connectivity
echo "Testing service connectivity..."
curl -H "Authorization: Bearer $ID_TOKEN" \
  "$SERVICE_URL/api/status" \
  -w "\nStatus: %{http_code}\n"

# Validate environment-specific configuration
curl -H "Authorization: Bearer $ID_TOKEN" \
  "$SERVICE_URL/api/config" \
  -w "\nStatus: %{http_code}\n"
```

### Performance Validation

Verify staging performance meets baseline requirements:

```bash
# Load testing (basic validation)
echo "Running basic load test on staging..."
for i in {1..10}; do
  curl -H "Authorization: Bearer $ID_TOKEN" \
    -s -o /dev/null \
    -w "Request $i: %{time_total}s - Status: %{http_code}\n" \
    "$SERVICE_URL/health"
  sleep 1
done

# Validate response times are within acceptable limits
# Target: P95 < 2000ms (matches monitoring alert thresholds)
```

## Monitoring and Observability

### Staging-Specific Monitoring

The staging environment leverages the same monitoring infrastructure as production with environment-specific configurations:

**Cloud Monitoring Metrics (Auto-configured):**
- **Error Rate**: `veria/ai-broker-staging/error_rate` (< 2% threshold)
- **P95 Latency**: `veria/ai-broker-staging/p95_latency` (< 2000ms threshold)
- **Resource Utilization**: CPU, Memory, Network monitoring
- **Health Check Status**: Endpoint availability tracking

**Alert Policies:**
```bash
# Verify staging alert policies are configured
gcloud alpha monitoring policies list \
  --project=veria-dev \
  --filter="displayName:staging" \
  --format="table(displayName,conditions[0].displayName,enabled)"
```

**Dashboard Access:**
Import the staging dashboard configuration:
```bash
# The dashboard JSON can be imported with staging-specific metrics
# Located at: /infra/monitoring/dashboard-staging.json
```

### Log Analysis

View staging logs and troubleshoot issues:

```bash
# View Cloud Run service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-broker-staging" \
  --limit=50 \
  --project=veria-dev \
  --format="table(timestamp,severity,jsonPayload.message)"

# View infrastructure deployment logs
gcloud logging read "resource.type=gce_instance AND jsonPayload.message:staging" \
  --limit=20 \
  --project=veria-dev
```

## Troubleshooting

### Common Issues and Solutions

#### 1. WIF Authentication Failures

**Symptom**: GitHub Actions workflow fails with authentication errors
```
Error: google-github-actions/auth failed to generate an access token
```

**Solutions**:
```bash
# Verify branch condition matches
git branch --show-current  # Must be 'staging'

# Check WIF provider condition
gcloud iam workload-identity-pools providers describe github-provider-staging \
  --location=global \
  --workload-identity-pool=github-pool-staging \
  --project=veria-dev \
  --format="value(attributeCondition)"

# Ensure service account has correct IAM bindings
gcloud projects get-iam-policy veria-dev \
  --filter="bindings.members:principalSet://iam.googleapis.com/projects/190356591245/locations/global/workloadIdentityPools/github-pool-staging/*"
```

#### 2. Container Image Not Found

**Symptom**: Cloud Run deployment fails with image not found
```
Error: The user-provided container image does not exist or is not accessible
```

**Solutions**:
```bash
# Verify image exists in Artifact Registry
gcloud container images list --repository=us-central1-docker.pkg.dev/veria-dev/veria

# Check authentication to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Ensure using image digest, not tags
gcloud container images list-tags us-central1-docker.pkg.dev/veria-dev/veria/ai-broker \
  --format="value(digest)" \
  --sort-by=~timestamp \
  --limit=1
```

#### 3. Service Deployment Failures

**Symptom**: Cloud Run service fails to start or respond
```
Error: The request failed because the service is not ready to receive traffic
```

**Solutions**:
```bash
# Check service logs for startup errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-broker-staging" \
  --limit=10 \
  --project=veria-dev

# Verify environment variables and secrets
gcloud run services describe ai-broker-staging \
  --region=us-central1 \
  --project=veria-dev \
  --format="yaml(spec.template.spec.template.spec.containers[0].env)"

# Check resource allocation
gcloud run services describe ai-broker-staging \
  --region=us-central1 \
  --project=veria-dev \
  --format="yaml(spec.template.spec.template.spec.containers[0].resources)"
```

### Recovery Procedures

#### Rollback to Previous Revision

```bash
# List available revisions
gcloud run revisions list \
  --service=ai-broker-staging \
  --region=us-central1 \
  --project=veria-dev

# Rollback to previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=ai-broker-staging \
  --region=us-central1 \
  --project=veria-dev \
  --format="value(metadata.name)" \
  --sort-by=~metadata.creationTimestamp \
  --limit=2 | tail -n 1)

gcloud run services update-traffic ai-broker-staging \
  --to-revisions=$PREVIOUS_REVISION=100 \
  --region=us-central1 \
  --project=veria-dev
```

#### Infrastructure Recovery

```bash
# Destroy and recreate infrastructure if needed
terraform destroy -auto-approve
terraform apply -auto-approve

# Or target specific resources
terraform destroy -target=google_cloud_run_service.ai_broker
terraform apply -target=google_cloud_run_service.ai_broker
```

## Environment Management Commands

### Quick Reference

**Infrastructure Management:**
```bash
# Deploy infrastructure
cd infra/terraform/envs/staging
terraform init && terraform plan && terraform apply

# Update service
terraform apply -target=google_cloud_run_service.ai_broker

# Destroy environment
terraform destroy -auto-approve
```

**Service Management:**
```bash
# Deploy with digest
IMAGE_DIGEST=$(gcloud container images list-tags us-central1-docker.pkg.dev/veria-dev/veria/ai-broker --format="value(digest)" --sort-by=~timestamp --limit=1)
gcloud run deploy ai-broker-staging --image="us-central1-docker.pkg.dev/veria-dev/veria/ai-broker@${IMAGE_DIGEST}" --region=us-central1

# View service status
gcloud run services describe ai-broker-staging --region=us-central1 --format="yaml(status.url,status.latestCreatedRevisionName,status.traffic)"

# Get service URL
gcloud run services describe ai-broker-staging --region=us-central1 --format="value(status.url)"
```

**Validation Commands:**
```bash
# Health check
ID_TOKEN=$(gcloud auth print-identity-token --audiences=$SERVICE_URL)
curl -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/health"

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-broker-staging" --limit=20
```

## Security and Compliance

### Security Requirements

- **No Public Access**: All services remain private with ID-token authentication required
- **Branch Isolation**: WIF provider strictly enforces `refs/heads/staging` branch condition
- **Image Immutability**: All deployments use SHA256 digest references, never tags
- **Audit Trail**: All deployment actions logged and tracked through Cloud Logging

### Compliance Validation

```bash
# Verify private access policy
gcloud run services get-iam-policy ai-broker-staging \
  --region=us-central1 \
  --project=veria-dev

# Should NOT contain allUsers or allAuthenticatedUsers bindings

# Verify image deployment uses digest
gcloud run services describe ai-broker-staging \
  --region=us-central1 \
  --format="value(spec.template.spec.template.spec.containers[0].image)"

# Should show format: us-central1-docker.pkg.dev/veria-dev/veria/ai-broker@sha256:...
```

## Next Steps

After successful staging environment setup:

1. **Integration Testing**: Run comprehensive integration tests against staging
2. **Performance Validation**: Validate performance meets SLA requirements
3. **Security Review**: Conduct security validation of WIF configuration
4. **Production Promotion**: Use staging validation to inform production deployments
5. **Monitoring Setup**: Configure staging-specific alerts and dashboard access

## References

- **Infrastructure as Code**: `/infra/terraform/modules/wif/` for WIF module implementation
- **CI/CD Pipeline**: `.github/workflows/cd.yml` for automated deployment workflows
- **Monitoring Configuration**: `/infra/monitoring/` for metrics, alerts, and dashboards
- **Security Boundaries**: `/docs/security-boundaries.md` for WIF and service account separation
- **Technical Specification**: `tech-specs/Veria-Tech-Spec-v2-Blitzy.md` for complete system documentation