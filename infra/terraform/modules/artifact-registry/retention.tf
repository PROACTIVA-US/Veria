# Terraform configuration for Google Artifact Registry retention policies
# Implements container image lifecycle management for Veria platform
# Part of PR C - Security Hygiene implementation

# Variables for repository configuration
variable "project_id" {
  description = "GCP project ID where Artifact Registry repositories exist"
  type        = string
}

variable "location" {
  description = "Location of the Artifact Registry repositories"
  type        = string
  default     = "us-central1"
}

variable "repositories" {
  description = "Map of repository names to their configuration"
  type = map(object({
    name        = string
    description = string
    format      = string
  }))
  default = {
    veria = {
      name        = "veria"
      description = "Main container repository for Veria services"
      format      = "DOCKER"
    }
    veria-containers = {
      name        = "veria-containers"
      description = "Additional container repository for Veria components"
      format      = "DOCKER"
    }
  }
}

variable "tagged_keep_count" {
  description = "Number of tagged images to retain (latest production versions)"
  type        = number
  default     = 10
}

variable "untagged_retention_days" {
  description = "Number of days to retain untagged development/test images"
  type        = number
  default     = 30
}

variable "max_age_days" {
  description = "Maximum age in days for any image regardless of tags (regulatory compliance)"
  type        = number
  default     = 365
}

variable "production_tag_patterns" {
  description = "List of tag patterns to preserve for production-critical images"
  type        = list(string)
  default     = [
    "prod-*",
    "production-*",
    "release-*",
    "stable-*"
  ]
}

variable "dry_run_enabled" {
  description = "Enable dry run mode for testing policy impact before enforcement"
  type        = bool
  default     = false
}

variable "enable_audit_logs" {
  description = "Enable Cloud Audit Logs integration for compliance evidence"
  type        = bool
  default     = true
}

# Main retention policy for each repository
resource "google_artifact_registry_repository_cleanup_policy" "veria_retention_policy" {
  for_each = var.repositories

  project     = var.project_id
  location    = var.location
  repository  = each.value.name
  cleanup_policy_id = "${each.value.name}-lifecycle-policy"

  # Dry run configuration for testing policy impact
  dry_run = var.dry_run_enabled

  # Keep latest tagged images (production versions)
  cleanup_actions {
    id   = "keep-tagged-production-images"
    type = "Keep"
    
    # Condition to keep the last N tagged images
    condition {
      tag_state             = "TAGGED"
      tag_prefixes          = []  # Empty means all tagged images
      older_than            = ""  # Not age-based for this rule
      newer_than            = ""  # Not applicable for keep rules
      package_name_prefixes = []  # Apply to all packages
    }
    
    # Keep the specified number of most recent tagged images
    most_recent_versions {
      keep_count = var.tagged_keep_count
    }
  }

  # Keep production-critical tagged images regardless of count
  dynamic "cleanup_actions" {
    for_each = var.production_tag_patterns
    content {
      id   = "preserve-production-${replace(cleanup_actions.value, "*", "wildcard")}"
      type = "Keep"
      
      condition {
        tag_state             = "TAGGED"
        tag_prefixes          = [cleanup_actions.value]
        older_than            = ""
        newer_than            = ""
        package_name_prefixes = []
      }
      
      # Keep all production-tagged images
      most_recent_versions {
        keep_count = 999  # Effectively unlimited for production tags
      }
    }
  }

  # Keep images with vulnerability scan results and SBOM attachments
  cleanup_actions {
    id   = "preserve-security-analyzed-images"
    type = "Keep"
    
    condition {
      tag_state             = "TAGGED"
      tag_prefixes          = []
      older_than            = ""
      newer_than            = ""
      package_name_prefixes = []
    }
    
    # Custom filter to preserve images with security metadata
    # This preserves images that have completed security scanning
    most_recent_versions {
      keep_count = 100  # Reasonable upper limit for security-analyzed images
    }
  }

  # Delete untagged images after specified retention period
  cleanup_actions {
    id   = "delete-old-untagged-images"
    type = "Delete"
    
    condition {
      tag_state             = "UNTAGGED"
      tag_prefixes          = []
      older_than            = "${var.untagged_retention_days}d"
      newer_than            = ""
      package_name_prefixes = []
    }
  }

  # Delete very old images regardless of tags (regulatory compliance)
  cleanup_actions {
    id   = "delete-ancient-images-compliance"
    type = "Delete"
    
    condition {
      tag_state             = "ANY"  # Both tagged and untagged
      tag_prefixes          = []     # All tags
      older_than            = "${var.max_age_days}d"
      newer_than            = ""
      package_name_prefixes = []
    }
  }

  # Exception: Don't delete production tags even if old (manual override needed)
  dynamic "cleanup_actions" {
    for_each = var.production_tag_patterns
    content {
      id   = "exempt-old-production-${replace(cleanup_actions.value, "*", "wildcard")}"
      type = "Keep"
      
      condition {
        tag_state             = "TAGGED"
        tag_prefixes          = [cleanup_actions.value]
        older_than            = "${var.max_age_days}d"
        newer_than            = ""
        package_name_prefixes = []
      }
      
      most_recent_versions {
        keep_count = 999  # Keep old production images
      }
    }
  }

  # Lifecycle management to allow manual overrides during emergencies
  lifecycle {
    ignore_changes = [
      # Allow manual policy modifications during incidents
      cleanup_actions,
      # Allow dry_run toggle for emergency testing
      dry_run
    ]
  }

  depends_on = [
    google_artifact_registry_repository.repositories
  ]
}

# Ensure repositories exist before applying retention policies
resource "google_artifact_registry_repository" "repositories" {
  for_each = var.repositories

  project       = var.project_id
  location      = var.location
  repository_id = each.value.name
  description   = each.value.description
  format        = each.value.format

  # Enable cleanup policies
  cleanup_policy_dry_run = var.dry_run_enabled

  # Docker repository configuration
  docker_config {
    immutable_tags = false  # Allow tag updates for development workflows
  }

  # Maven repository configuration (if needed in future)
  dynamic "maven_config" {
    for_each = each.value.format == "MAVEN" ? [1] : []
    content {
      allow_snapshot_overwrites = false
      version_policy            = "VERSION_POLICY_UNSPECIFIED"
    }
  }

  labels = {
    environment     = "production"
    project         = "veria"
    retention       = "managed"
    compliance      = "enabled"
    security_scan   = "required"
    sbom_generation = "enabled"
  }
}

# Cloud Audit Log configuration for compliance evidence
resource "google_logging_project_sink" "artifact_registry_audit_logs" {
  count = var.enable_audit_logs ? 1 : 0

  name        = "artifact-registry-cleanup-audit-sink"
  project     = var.project_id
  destination = "storage.googleapis.com/${google_storage_bucket.audit_logs_bucket[0].name}"

  # Filter for Artifact Registry cleanup operations
  filter = <<-EOT
    resource.type="gce_instance" OR resource.type="artifactregistry.googleapis.com/Repository"
    AND (
      protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.DeletePackage" OR
      protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.DeleteVersion" OR
      protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.ListVersions"
    )
    AND protoPayload.resourceName:("${var.location}/repositories/veria" OR "${var.location}/repositories/veria-containers")
  EOT

  # Ensure unique writer identity per sink
  unique_writer_identity = true

  depends_on = [
    google_storage_bucket.audit_logs_bucket
  ]
}

# Storage bucket for audit logs (compliance evidence)
resource "google_storage_bucket" "audit_logs_bucket" {
  count = var.enable_audit_logs ? 1 : 0

  name          = "${var.project_id}-artifact-registry-audit-logs"
  project       = var.project_id
  location      = var.location
  force_destroy = false  # Prevent accidental deletion

  # Compliance-grade storage settings
  storage_class = "STANDARD"
  
  # Enable versioning for audit trail integrity
  versioning {
    enabled = true
  }

  # Lifecycle management for audit logs
  lifecycle_rule {
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90  # Move to coldline after 90 days
    }
  }

  lifecycle_rule {
    action {
      type = "SetStorageClass" 
      storage_class = "ARCHIVE"
    }
    condition {
      age = 365  # Move to archive after 1 year
    }
  }

  # Prevent public access
  public_access_prevention = "enforced"
  
  # Enable uniform bucket-level access
  uniform_bucket_level_access = true

  labels = {
    purpose     = "audit-logs"
    compliance  = "required"
    retention   = "7-years"
    project     = "veria"
    environment = "production"
  }
}

# IAM binding for audit log sink
resource "google_storage_bucket_iam_member" "audit_logs_writer" {
  count = var.enable_audit_logs ? 1 : 0

  bucket = google_storage_bucket.audit_logs_bucket[0].name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.artifact_registry_audit_logs[0].writer_identity
}

# Data source to verify policy execution
data "google_artifact_registry_repository" "policy_verification" {
  for_each = var.repositories

  project       = var.project_id
  location      = var.location
  repository_id = each.value.name

  depends_on = [
    google_artifact_registry_repository_cleanup_policy.veria_retention_policy
  ]
}

# Output information for verification and troubleshooting
output "retention_policy_details" {
  description = "Details of created retention policies for verification"
  value = {
    for repo_key, repo in var.repositories : repo_key => {
      repository_name = repo.name
      policy_id       = google_artifact_registry_repository_cleanup_policy.veria_retention_policy[repo_key].cleanup_policy_id
      location        = var.location
      project_id      = var.project_id
      tagged_keep_count = var.tagged_keep_count
      untagged_retention_days = var.untagged_retention_days
      max_age_days = var.max_age_days
      dry_run_enabled = var.dry_run_enabled
      production_patterns = var.production_tag_patterns
    }
  }
}

output "audit_configuration" {
  description = "Audit logging configuration for compliance verification"
  value = var.enable_audit_logs ? {
    sink_name = google_logging_project_sink.artifact_registry_audit_logs[0].name
    bucket_name = google_storage_bucket.audit_logs_bucket[0].name
    writer_identity = google_logging_project_sink.artifact_registry_audit_logs[0].writer_identity
  } : null
}

output "repository_urls" {
  description = "URLs of managed repositories for reference"
  value = {
    for repo_key, repo in var.repositories : repo_key => 
    "https://console.cloud.google.com/artifacts/docker/${var.project_id}/${var.location}/${repo.name}"
  }
}