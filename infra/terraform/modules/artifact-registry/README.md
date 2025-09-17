# Artifact Registry Retention Policy Module

## Overview

This Terraform module implements comprehensive retention policies for Google Cloud Artifact Registry repositories, providing automated lifecycle management for container images and other artifacts. The module enforces security hygiene controls that maintain the last 10 tagged image digests while automatically removing untagged digests after 30 days, supporting supply chain security requirements and compliance frameworks including NIST SSDF §5.3.

### Key Benefits

- **Supply Chain Security**: Automated removal of vulnerable or outdated container images
- **Cost Optimization**: Intelligent storage management reducing long-term storage costs
- **Compliance Support**: Audit-ready retention policies with comprehensive logging
- **Operational Efficiency**: Zero-touch lifecycle management with Terraform state tracking
- **Security Posture**: Curated image inventory supporting disaster recovery scenarios

## Quick Start

### Basic Usage

```hcl
module "artifact_registry_retention" {
  source = "../modules/artifact-registry"
  
  project_id = var.project_id
  location   = var.region
  repositories = [
    {
      repository_id = "ai-broker-images"
      format       = "DOCKER"
      description  = "Container images for AI broker service"
    }
  ]
  
  # Default retention policy (recommended)
  default_retention_policy = {
    keep_tag_revisions   = 10
    tag_state           = "TAGGED"
    tag_prefixes        = []
  }
  
  default_cleanup_policy = {
    delete_after_days    = 30
    tag_state           = "UNTAGGED" 
    tag_prefixes        = []
  }
}
```

## Module Configuration

### Input Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `project_id` | `string` | yes | - | GCP project ID where Artifact Registry repositories will be created |
| `location` | `string` | yes | - | Region for Artifact Registry (e.g., "us-central1") |
| `repositories` | `list(object)` | yes | - | List of repository configurations to create with retention policies |
| `default_retention_policy` | `object` | no | See below | Default retention policy applied to all repositories |
| `default_cleanup_policy` | `object` | no | See below | Default cleanup policy for untagged images |
| `enable_audit_logging` | `bool` | no | `true` | Enable Cloud Audit Logs for retention policy actions |
| `labels` | `map(string)` | no | `{}` | Labels to apply to all created resources |

#### Repository Object Schema

```hcl
repositories = [
  {
    repository_id = "string"           # Unique identifier for the repository
    format       = "string"           # Repository format: "DOCKER", "NPM", "PYTHON", etc.
    description  = "string"           # Human-readable description
    mode         = "string"           # Optional: "STANDARD_REPOSITORY" (default) or "REMOTE_REPOSITORY"
    cleanup_policies = list(object({  # Optional: Repository-specific cleanup policies
      id = string
      action = object({
        type = string                # "DELETE" or "KEEP"
      })
      condition = object({
        tag_state             = string        # "TAGGED", "UNTAGGED", "ANY"
        tag_prefixes         = list(string)   # Tag prefixes to match
        version_name_prefixes = list(string) # Version name prefixes
        package_name_prefixes = list(string) # Package name prefixes
        older_than           = string        # Duration string (e.g., "30d", "720h")
        newer_than           = string        # Duration string for minimum age
      })
    }))
  }
]
```

#### Default Retention Policy

```hcl
default_retention_policy = {
  keep_tag_revisions = 10              # Number of tagged revisions to retain
  tag_state         = "TAGGED"         # Apply to tagged images only
  tag_prefixes      = []               # Empty list applies to all tags
}
```

#### Default Cleanup Policy  

```hcl
default_cleanup_policy = {
  delete_after_days = 30               # Delete untagged images after 30 days
  tag_state        = "UNTAGGED"        # Apply to untagged images only
  tag_prefixes     = []                # Empty list applies to all untagged images
}
```

### Output Values

| Output | Type | Description |
|--------|------|-------------|
| `repository_ids` | `list(string)` | List of created repository resource IDs |
| `repository_names` | `list(string)` | List of fully qualified repository names |
| `retention_policy_ids` | `list(string)` | List of retention policy resource IDs for audit tracking |
| `registry_urls` | `map(string)` | Map of repository_id to Docker registry URLs |
| `cleanup_policy_count` | `number` | Total number of cleanup policies created |

## Advanced Configuration Examples

### Multi-Repository Setup with Different Policies

```hcl
module "artifact_registry_retention" {
  source = "../modules/artifact-registry"
  
  project_id = "veria-dev"
  location   = "us-central1"
  
  repositories = [
    {
      repository_id = "ai-broker-prod"
      format       = "DOCKER"
      description  = "Production AI broker images - extended retention"
      cleanup_policies = [
        {
          id = "keep-prod-tags"
          action = {
            type = "KEEP"
          }
          condition = {
            tag_state    = "TAGGED"
            tag_prefixes = ["v", "release-", "stable-"]
            older_than   = ""
            newer_than   = ""
          }
        },
        {
          id = "cleanup-untagged-prod"
          action = {
            type = "DELETE"
          }
          condition = {
            tag_state     = "UNTAGGED"
            tag_prefixes  = []
            older_than    = "7d"  # Shorter cleanup for production
            newer_than    = ""
          }
        }
      ]
    },
    {
      repository_id = "ai-broker-dev"
      format       = "DOCKER" 
      description  = "Development AI broker images - aggressive cleanup"
      cleanup_policies = [
        {
          id = "keep-recent-dev"
          action = {
            type = "KEEP"
          }
          condition = {
            tag_state    = "TAGGED"
            tag_prefixes = ["dev-", "feature-", "main-"]
            newer_than   = "14d"  # Keep recent dev images
            older_than   = ""
          }
        },
        {
          id = "cleanup-old-dev"
          action = {
            type = "DELETE"
          }
          condition = {
            tag_state    = "ANY"
            tag_prefixes = []
            older_than   = "14d"  # Aggressive cleanup for dev
            newer_than   = ""
          }
        }
      ]
    }
  ]
  
  # Override defaults for development environment
  default_retention_policy = {
    keep_tag_revisions = 5   # Fewer revisions in dev
    tag_state         = "TAGGED"
    tag_prefixes      = ["dev-", "feature-"]
  }
  
  default_cleanup_policy = {
    delete_after_days = 7    # Faster cleanup in dev
    tag_state        = "UNTAGGED"
    tag_prefixes     = []
  }
  
  labels = {
    environment = "development"
    team        = "platform"
    component   = "ci-cd"
  }
}
```

### Production vs Development Retention Strategies

#### Production Environment Strategy
```hcl
# Production: Extended retention with compliance focus
module "production_registry" {
  source = "../modules/artifact-registry"
  
  project_id = "veria-prod"
  location   = "us-central1"
  
  repositories = [
    {
      repository_id = "ai-broker"
      format       = "DOCKER"
      description  = "Production AI broker service images"
      cleanup_policies = [
        {
          id = "regulatory-retention"
          action = { type = "KEEP" }
          condition = {
            tag_state     = "TAGGED"
            tag_prefixes  = ["v", "release-"]
            newer_than    = "0d"
            older_than    = "2555d"  # 7 years for regulatory compliance
          }
        },
        {
          id = "security-cleanup"
          action = { type = "DELETE" }
          condition = {
            tag_state    = "UNTAGGED"
            tag_prefixes = []
            older_than   = "90d"  # Longer retention for forensics
            newer_than   = ""
          }
        }
      ]
    }
  ]
  
  default_retention_policy = {
    keep_tag_revisions = 50  # Extended production retention
    tag_state         = "TAGGED"
    tag_prefixes      = []
  }
}
```

#### Development Environment Strategy
```hcl
# Development: Aggressive cleanup with cost optimization
module "development_registry" {
  source = "../modules/artifact-registry"
  
  project_id = "veria-dev"
  location   = "us-central1"
  
  repositories = [
    {
      repository_id = "ai-broker"
      format       = "DOCKER"
      description  = "Development AI broker service images"
    }
  ]
  
  default_retention_policy = {
    keep_tag_revisions = 3   # Minimal retention for dev
    tag_state         = "TAGGED" 
    tag_prefixes      = []
  }
  
  default_cleanup_policy = {
    delete_after_days = 3    # Aggressive cleanup
    tag_state        = "UNTAGGED"
    tag_prefixes     = []
  }
}
```

## Integration with Existing Infrastructure

### GCP Module Integration

This module integrates seamlessly with the existing GCP module by consuming its outputs:

```hcl
# In envs/dev/main.tf or envs/staging/main.tf
module "gcp" {
  source = "../modules/gcp"
  # ... existing configuration
}

module "artifact_registry_retention" {
  source = "../modules/artifact-registry"
  
  project_id = module.gcp.project_id
  location   = module.gcp.region
  
  repositories = [
    {
      repository_id = "${module.gcp.service_name}-images"
      format       = "DOCKER"
      description  = "Container images for ${module.gcp.service_name}"
    }
  ]
  
  # Reference existing artifact registry if created by GCP module
  depends_on = [module.gcp]
}
```

### CI/CD Pipeline Integration

The retention policies work automatically with the existing GitHub Actions CD pipeline:

```hcl
# The CD pipeline will push to repositories created by this module
# Registry URLs are available as outputs for workflow configuration
output "ai_broker_registry_url" {
  value = module.artifact_registry_retention.registry_urls["ai-broker-images"]
}
```

## Terraform Commands

### Initial Deployment

```bash
# Navigate to environment directory
cd infra/terraform/envs/dev  # or envs/staging

# Initialize Terraform (first time only)
terraform init

# Validate configuration
terraform validate

# Review planned changes
terraform plan -var-file="dev.auto.tfvars"

# Apply retention policies
terraform apply -var-file="dev.auto.tfvars" -auto-approve
```

### Updating Retention Policies

```bash
# Modify retention policy parameters in your terraform files
# Then apply changes:
terraform plan -var-file="dev.auto.tfvars" -target="module.artifact_registry_retention"
terraform apply -var-file="dev.auto.tfvars" -target="module.artifact_registry_retention" -auto-approve
```

### Module-Specific Operations

```bash
# View current module state
terraform state list | grep artifact_registry

# Import existing Artifact Registry (if needed)
terraform import 'module.artifact_registry_retention.google_artifact_registry_repository.repos["ai-broker-images"]' projects/veria-dev/locations/us-central1/repositories/ai-broker-images

# Force module refresh
terraform refresh -target="module.artifact_registry_retention"
```

## Verification Procedures

### Policy Status Verification

Verify that retention policies are active and correctly configured:

```bash
# Check repository configuration and policies
gcloud artifacts repositories list \
  --location=us-central1 \
  --project=veria-dev \
  --format="table(name,format,createTime,updateTime)"

# Verify cleanup policies for specific repository  
gcloud artifacts repositories describe ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --format="yaml(cleanupPolicies)"

# List all cleanup policies across repositories
gcloud artifacts repositories list \
  --location=us-central1 \
  --project=veria-dev \
  --format="yaml(name,cleanupPolicies)"
```

### Image Inventory Verification

Check current image inventory and retention status:

```bash
# List all images in a repository
gcloud artifacts docker images list us-central1-docker.pkg.dev/veria-dev/ai-broker-images \
  --include-tags \
  --format="table(package,version,createTime,updateTime,tags.list():label=TAGS)"

# Check tagged vs untagged images
gcloud artifacts docker images list us-central1-docker.pkg.dev/veria-dev/ai-broker-images \
  --filter="tags:*" \
  --format="value(package,version,createTime)" \
  | wc -l  # Count of tagged images

gcloud artifacts docker images list us-central1-docker.pkg.dev/veria-dev/ai-broker-images \
  --filter="NOT tags:*" \
  --format="value(package,version,createTime)" \
  | wc -l  # Count of untagged images
```

### Audit Log Verification

Verify retention policy execution through Cloud Audit Logs:

```bash
# Query cleanup policy executions (last 30 days)
gcloud logging read 'resource.type="gce_instance" 
  protoPayload.serviceName="artifactregistry.googleapis.com"
  protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.DeletePackage"
  timestamp>="2024-01-01T00:00:00Z"' \
  --limit=50 \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.resourceName)"

# Monitor retention policy changes
gcloud logging read 'resource.type="artifact_registry_repository"
  protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.UpdateRepository"
  jsonPayload.cleanupPolicies:*' \
  --limit=10 \
  --format="yaml(timestamp,protoPayload.request,protoPayload.response)"
```

### Storage Usage Monitoring

Track storage consumption and optimization impact:

```bash
# Check repository storage usage
gcloud artifacts repositories describe ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --format="yaml(sizeBytes,description,createTime)"

# Compare storage usage over time (requires monitoring setup)
gcloud monitoring metrics list --filter="metric.type=artifactregistry.googleapis.com/repository/storage_utilization_bytes"
```

## Rollback Procedures

### Disable Cleanup Policies

If retention policies are causing issues, disable them temporarily:

```bash
# Method 1: Update Terraform configuration
# Set cleanup_policies = [] in your terraform configuration
# Then apply changes:
terraform apply -var-file="dev.auto.tfvars" -target="module.artifact_registry_retention"

# Method 2: Direct gcloud command (emergency only)
gcloud artifacts repositories update ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --clear-cleanup-policies
```

### Emergency Policy Suspension

For critical situations requiring immediate policy suspension:

```bash
# Backup current repository configuration
gcloud artifacts repositories describe ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --format="yaml" > ai-broker-images-backup.yaml

# Remove all cleanup policies
gcloud artifacts repositories update ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --clear-cleanup-policies

# Verify policies are removed
gcloud artifacts repositories describe ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --format="yaml(cleanupPolicies)"
```

### Restore from Backup

Restore previous repository configuration if needed:

```bash
# Note: gcloud does not support direct policy restoration
# Use Terraform to restore to known-good state:

# Restore from git history
git checkout HEAD~1 -- infra/terraform/envs/dev/artifact-registry.tf
terraform apply -var-file="dev.auto.tfvars" -target="module.artifact_registry_retention"

# Or restore from Terraform state backup
terraform state pull > current-state-backup.tfstate
terraform apply -var-file="dev.auto.tfvars" -refresh=true
```

### Recovery Verification

After rollback operations, verify system integrity:

```bash
# Confirm retention policies match expected configuration
terraform plan -var-file="dev.auto.tfvars" -target="module.artifact_registry_retention"

# Verify no unexpected deletions occurred
gcloud artifacts docker images list us-central1-docker.pkg.dev/veria-dev/ai-broker-images \
  --include-tags \
  --format="table(package,version,createTime,tags.list():label=TAGS)" \
  > post-rollback-inventory.txt

# Compare with pre-rollback inventory (if available)
diff pre-rollback-inventory.txt post-rollback-inventory.txt
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Cleanup policies not executing

**Symptoms:**
- Expected image deletions not occurring
- Untagged images accumulating beyond policy thresholds

**Diagnosis:**
```bash
# Check policy configuration
gcloud artifacts repositories describe REPOSITORY_NAME \
  --location=LOCATION \
  --project=PROJECT_ID \
  --format="yaml(cleanupPolicies)"

# Verify Cloud Artifact Registry API is enabled
gcloud services list --enabled --filter="name:artifactregistry.googleapis.com"
```

**Solutions:**
1. Verify cleanup policy syntax is correct in Terraform configuration
2. Ensure sufficient IAM permissions for policy execution
3. Check that repository has eligible images for cleanup
4. Confirm policy conditions don't conflict (e.g., overlapping tag prefixes)

#### Issue: IAM permission denied errors

**Symptoms:**
```
Error: googleapi: Error 403: Permission 'artifactregistry.repositories.update' denied
```

**Solutions:**
```bash
# Grant required permissions to service account
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.admin"

# Or use custom role with minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.repoAdmin"
```

#### Issue: Images not being tagged properly

**Symptoms:**
- All images appear as untagged
- Retention policies affecting wrong images

**Diagnosis:**
```bash
# Check image tagging in CI pipeline
gcloud artifacts docker images list REGISTRY_URL \
  --include-tags \
  --format="yaml(package,version,tags)"
```

**Solutions:**
1. Verify CI/CD pipeline tags images correctly:
   ```bash
   docker tag IMAGE_NAME:latest us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE_NAME:TAG
   docker push us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE_NAME:TAG
   ```
2. Update cleanup policy conditions to match actual tagging patterns
3. Review tag prefix configuration in retention policies

#### Issue: Terraform state conflicts

**Symptoms:**
```
Error: resource already exists
Error: cleanup policy ID conflicts
```

**Solutions:**
```bash
# Import existing repository
terraform import 'module.artifact_registry_retention.google_artifact_registry_repository.repos["REPO_ID"]' projects/PROJECT_ID/locations/LOCATION/repositories/REPO_ID

# Resolve state conflicts
terraform refresh
terraform plan  # Review state differences
terraform apply  # Reconcile state
```

#### Issue: Storage costs not decreasing

**Symptoms:**
- Cleanup policies active but storage usage unchanged
- Expected cost reduction not realized

**Diagnosis:**
```bash
# Analyze storage usage trends
gcloud monitoring time-series list \
  --filter='metric.type="artifactregistry.googleapis.com/repository/storage_utilization_bytes"' \
  --interval-start-time="2024-01-01T00:00:00Z" \
  --interval-end-time="2024-01-31T00:00:00Z"
```

**Solutions:**
1. Verify cleanup policies are targeting correct images
2. Check policy execution frequency (cleanup runs daily)
3. Review tag/untag patterns to ensure policies are effective
4. Consider adjusting retention periods for more aggressive cleanup

### Debugging Commands

```bash
# Enable detailed Terraform logging
export TF_LOG=DEBUG
export TF_LOG_PATH=terraform-debug.log
terraform apply -var-file="dev.auto.tfvars"

# Monitor Artifact Registry API calls
gcloud logging read 'resource.type="artifact_registry_repository"' \
  --limit=20 \
  --format="yaml(timestamp,protoPayload.methodName,protoPayload.resourceName)"

# Check repository health
gcloud artifacts repositories describe REPOSITORY_NAME \
  --location=LOCATION \
  --project=PROJECT_ID \
  --format="yaml"

# Test cleanup policy simulation (if available)
gcloud artifacts cleanup-policies simulate \
  --repository=REPOSITORY_NAME \
  --location=LOCATION \
  --project=PROJECT_ID
```

## Audit Logging and Compliance Evidence

### Cloud Audit Log Queries

Generate compliance evidence for retention policy actions:

```bash
# Generate retention policy audit report (30 days)
gcloud logging read '
  resource.type="artifact_registry_repository"
  protoPayload.serviceName="artifactregistry.googleapis.com"
  (protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.DeletePackage" OR
   protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.UpdateRepository")
  timestamp>="'$(date -d '30 days ago' --iso-8601)'"' \
  --format="csv(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.methodName,protoPayload.resourceName,protoPayload.request.updateMask)" \
  > artifact-registry-audit-report.csv

# Query retention policy compliance evidence
gcloud logging read '
  resource.type="artifact_registry_repository"
  jsonPayload.cleanupPolicies:*
  timestamp>="'$(date -d '90 days ago' --iso-8601)'"' \
  --format="json" \
  > retention-policy-evidence.json
```

### Compliance Documentation

Generate reports for regulatory frameworks:

```bash
# NIST SSDF §5.3 Supply Chain Security Evidence
cat << 'EOF' > nist-ssdf-compliance-report.md
# NIST SSDF §5.3 Compliance Report

## Artifact Registry Retention Policies

- **Policy Implementation**: $(date)
- **Repository Count**: $(gcloud artifacts repositories list --location=us-central1 --format="value(name)" | wc -l)
- **Active Cleanup Policies**: $(gcloud artifacts repositories list --location=us-central1 --format="json" | jq '[.[] | select(.cleanupPolicies != null)] | length')

## Retention Configuration
$(gcloud artifacts repositories list --location=us-central1 --format="yaml(name,cleanupPolicies)")

## Evidence Generation Command
\`\`\`bash
$(echo "gcloud logging read 'resource.type=\"artifact_registry_repository\"' --limit=100")
\`\`\`
EOF

# SOX Section 404 Change Management Evidence  
gcloud logging read '
  resource.type="artifact_registry_repository"
  protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.UpdateRepository"
  protoPayload.request.updateMask="cleanup_policies"' \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.resourceName)" \
  > sox-change-management-evidence.txt
```

### Automated Compliance Reporting

Set up automated compliance evidence collection:

```bash
# Create Cloud Function or Cloud Run job for automated reporting
# This would typically be implemented as infrastructure code
cat << 'EOF' > generate-compliance-report.sh
#!/bin/bash
# Automated compliance evidence generation
# Run weekly via Cloud Scheduler

REPORT_DATE=$(date +%Y%m%d)
BUCKET="gs://veria-compliance-evidence"

# Generate audit evidence
gcloud logging read 'resource.type="artifact_registry_repository"' \
  --format="json" > "audit-evidence-${REPORT_DATE}.json"

# Upload to compliance evidence bucket
gsutil cp "audit-evidence-${REPORT_DATE}.json" "${BUCKET}/artifact-registry/"

# Generate summary report
echo "Compliance evidence generated: ${REPORT_DATE}" | \
  gcloud pubsub topics publish compliance-reports --message=-
EOF
```

## Cost Optimization Tips

### Storage Calculation Examples

Estimate storage cost impact of different retention policies:

```bash
# Calculate current repository storage usage
REPO_SIZE=$(gcloud artifacts repositories describe ai-broker-images \
  --location=us-central1 \
  --project=veria-dev \
  --format="value(sizeBytes)")

echo "Current repository size: $(numfmt --to=iec ${REPO_SIZE})"
echo "Monthly storage cost (estimate): \$$(echo "scale=2; ${REPO_SIZE} / 1024^3 * 0.20" | bc)"
```

### Optimization Strategies

#### Aggressive Development Cleanup
```hcl
# Development environment: Maximum cost savings
default_cleanup_policy = {
  delete_after_days = 1    # Very aggressive cleanup
  tag_state        = "UNTAGGED"
  tag_prefixes     = []
}

default_retention_policy = {
  keep_tag_revisions = 2   # Minimal tagged retention
  tag_state         = "TAGGED"
  tag_prefixes      = []
}
```

#### Production Cost-Conscious Settings  
```hcl
# Production: Balance between compliance and cost
cleanup_policies = [
  {
    id = "remove-old-untagged"
    action = { type = "DELETE" }
    condition = {
      tag_state    = "UNTAGGED"
      older_than   = "7d"     # Quick untagged cleanup
      tag_prefixes = []
    }
  },
  {
    id = "limit-dev-images"
    action = { type = "DELETE" }
    condition = {
      tag_state    = "TAGGED"
      tag_prefixes = ["dev-", "feature-", "test-"]
      older_than   = "30d"    # Remove dev images from prod registry
    }
  }
]
```

### Cost Monitoring Setup

```bash
# Set up billing alerts for Artifact Registry
gcloud alpha billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Artifact Registry Storage Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=90,basis=CURRENT_SPEND \
  --threshold-rule=percent=100,basis=CURRENT_SPEND \
  --services=services/1F41-E49A-B664  # Artifact Registry service ID

# Monitor storage trends
gcloud monitoring dashboards create --config-from-file=artifact-registry-cost-dashboard.json
```

---

## Support and Maintenance

This module is maintained as part of the Veria infrastructure stack. For issues or enhancements:

1. Check existing [troubleshooting guide](#troubleshooting) above
2. Review [audit logs](#audit-logging-and-compliance-evidence) for policy execution
3. Verify [integration patterns](#integration-with-existing-infrastructure) with other modules
4. Consult the main infrastructure documentation at `/infra/terraform/README.md`

**Module Version**: 1.0.0  
**Last Updated**: $(date)  
**Terraform Version**: >= 1.5.0  
**Google Provider Version**: >= 5.37.0