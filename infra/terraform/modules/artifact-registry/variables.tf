# Terraform Variables for Artifact Registry Retention Module
# 
# This module manages Artifact Registry retention policies for container images,
# implementing security hygiene practices and compliance requirements as outlined
# in the Veria technical specification. The retention policies ensure proper
# lifecycle management while supporting supply chain security through SBOM
# preservation and vulnerability scan artifacts.
#
# Key Security Features:
# - Curated image retention for production deployments
# - Automatic cleanup of untagged development images
# - Exemption patterns for critical production releases
# - Integration with supply chain security artifacts (SBOM, vulnerability scans)
# - Compliance-grade audit logging and dry-run capabilities

# =============================================================================
# CORE CONFIGURATION VARIABLES
# =============================================================================

variable "project_id" {
  type        = string
  description = <<-EOF
    GCP project ID where the Artifact Registry repositories are located.
    This project must have the Artifact Registry API enabled and appropriate
    IAM permissions for the service account managing retention policies.
    
    Example: "veria-dev" (project number: 190356591245)
  EOF

  validation {
    condition     = can(regex("^[a-z0-9\\-]+$", var.project_id))
    error_message = "Project ID must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "region" {
  type        = string
  description = <<-EOF
    GCP region where the Artifact Registry repositories are located.
    Must be a valid Google Cloud region supporting Artifact Registry.
    
    Default aligns with the Veria platform's primary deployment region.
  EOF
  default     = "us-central1"

  validation {
    condition     = can(regex("^[a-z0-9\\-]+$", var.region))
    error_message = "Region must be a valid GCP region format (e.g., us-central1, europe-west1)."
  }
}

variable "repositories" {
  type        = list(string)
  description = <<-EOF
    List of Artifact Registry repository names to manage with retention policies.
    
    Each repository will have identical retention rules applied. Repository names
    must match existing Artifact Registry repositories in the specified project
    and region.
    
    Example: ["veria", "ai-broker"] for managing both main application and
    ai-broker service container images.
  EOF

  validation {
    condition     = length(var.repositories) > 0
    error_message = "At least one repository must be specified."
  }

  validation {
    condition = alltrue([
      for repo in var.repositories : can(regex("^[a-z0-9\\-_]+$", repo))
    ])
    error_message = "Repository names must contain only lowercase letters, numbers, hyphens, and underscores."
  }
}

# =============================================================================
# RETENTION POLICY CONFIGURATION
# =============================================================================

variable "keep_tagged_count" {
  type        = number
  description = <<-EOF
    Number of most recent tagged images to retain per repository.
    
    This setting preserves the latest N tagged container images for rollback
    capabilities and production deployment history. Tagged images include those
    with semantic versioning (v1.0.0) or deployment tags (prod-20240315).
    
    Value aligns with security architecture requirements for maintaining
    deployment artifacts while managing storage costs.
  EOF
  default     = 10

  validation {
    condition     = var.keep_tagged_count >= 1 && var.keep_tagged_count <= 100
    error_message = "Tagged image retention count must be between 1 and 100."
  }
}

variable "delete_untagged_after_days" {
  type        = number
  description = <<-EOF
    Number of days to retain untagged images before automatic deletion.
    
    Untagged images typically represent intermediate build artifacts, development
    images, or orphaned layers from failed builds. This setting ensures cleanup
    of build artifacts while providing reasonable retention for debugging.
    
    Default value balances storage efficiency with operational requirements
    for investigating build issues and development workflows.
  EOF
  default     = 30

  validation {
    condition     = var.delete_untagged_after_days >= 1 && var.delete_untagged_after_days <= 365
    error_message = "Untagged image retention days must be between 1 and 365."
  }
}

variable "delete_tagged_after_days" {
  type        = number
  description = <<-EOF
    Number of days to retain tagged images before automatic deletion.
    
    This provides a secondary retention control for very old tagged images
    beyond the keep_tagged_count limit. Helps ensure long-term storage
    management while maintaining compliance with audit requirements.
    
    Set to a large value (365 days) to allow for annual compliance cycles
    and long-term audit trail requirements.
  EOF
  default     = 365

  validation {
    condition     = var.delete_tagged_after_days >= 30 && var.delete_tagged_after_days <= 2555 # ~7 years
    error_message = "Tagged image retention days must be between 30 and 2555 (approximately 7 years)."
  }
}

# =============================================================================
# EXEMPTION AND PRESERVATION RULES
# =============================================================================

variable "exempt_tag_patterns" {
  type        = list(string)
  description = <<-EOF
    List of tag patterns to exempt from automatic deletion policies.
    
    Images matching these patterns will be preserved regardless of age or count
    limits. Patterns support shell-style wildcards (* and ?).
    
    Default patterns protect production releases and critical deployments:
    - "prod-*": Production deployment tags
    - "release-*": Official release tags
    - "v*": Semantic version tags
    
    Use with caution as exempted images can accumulate over time.
  EOF
  default     = ["prod-*", "release-*", "v*"]

  validation {
    condition = alltrue([
      for pattern in var.exempt_tag_patterns : can(regex("^[a-zA-Z0-9\\-_\\*\\?]+$", pattern))
    ])
    error_message = "Tag patterns must contain only alphanumeric characters, hyphens, underscores, and wildcards (* ?)."
  }
}

variable "preserve_with_sbom" {
  type        = bool
  description = <<-EOF
    Preserve container images that have associated Software Bill of Materials (SBOM).
    
    When enabled, images with SBOM metadata or attestations will be protected
    from automatic deletion policies. This supports supply chain security
    requirements by maintaining traceability for audited and documented images.
    
    SBOM preservation aligns with NIST SSDF guidelines and compliance requirements
    for maintaining software component inventories.
  EOF
  default     = true
}

variable "preserve_with_vulnerability_scan" {
  type        = bool
  description = <<-EOF
    Preserve container images that have completed vulnerability scanning.
    
    When enabled, images with vulnerability scan results (including SARIF reports)
    will be protected from automatic deletion. This ensures that security-validated
    images remain available for compliance and audit purposes.
    
    Supports the platform's security monitoring and incident response capabilities
    by maintaining access to vulnerability assessment history.
  EOF
  default     = true
}

# =============================================================================
# OPERATIONAL AND COMPLIANCE FEATURES
# =============================================================================

variable "dry_run" {
  type        = bool
  description = <<-EOF
    Enable dry-run mode for retention policy testing.
    
    When enabled, retention policies will be evaluated and logged but no
    actual deletion operations will be performed. This allows for safe
    testing of retention rules before enabling automatic cleanup.
    
    Recommended for initial deployment and policy changes to validate
    expected behavior without risk of unintended data loss.
  EOF
  default     = false
}

variable "enable_audit_logging" {
  type        = bool
  description = <<-EOF
    Enable comprehensive audit logging for all retention policy actions.
    
    When enabled, all policy evaluations, exemptions, and deletion actions
    will be logged to Cloud Audit Logs for compliance tracking and forensic
    analysis. Logs include detailed metadata about affected images and
    policy decision rationale.
    
    Essential for compliance frameworks requiring detailed audit trails
    of data lifecycle management actions.
  EOF
  default     = true
}

# =============================================================================
# ADVANCED CONFIGURATION
# =============================================================================

variable "policy_description_prefix" {
  type        = string
  description = <<-EOF
    Prefix for retention policy descriptions to aid in identification and management.
    
    This prefix will be prepended to all generated retention policy descriptions,
    helping operators identify policies managed by this Terraform module versus
    manually created policies.
  EOF
  default     = "Terraform-managed retention policy"

  validation {
    condition     = length(var.policy_description_prefix) <= 100
    error_message = "Policy description prefix must be 100 characters or less."
  }
}

variable "lifecycle_policy_priority" {
  type        = number
  description = <<-EOF
    Priority order for retention policy evaluation when multiple policies exist.
    
    Lower numbers indicate higher priority. This determines the order in which
    retention rules are applied when multiple policies might affect the same image.
    
    Default priority ensures these policies execute before less specific rules.
  EOF
  default     = 100

  validation {
    condition     = var.lifecycle_policy_priority >= 1 && var.lifecycle_policy_priority <= 1000
    error_message = "Lifecycle policy priority must be between 1 and 1000."
  }
}

variable "notification_topic" {
  type        = string
  description = <<-EOF
    Cloud Pub/Sub topic name for retention policy notifications.
    
    When specified, policy actions (deletions, exemptions) will publish
    notifications to this topic for integration with monitoring and alerting
    systems. Topic must exist in the same project.
    
    Leave empty to disable notifications.
  EOF
  default     = ""

  validation {
    condition = var.notification_topic == "" || can(regex("^[a-zA-Z0-9\\-_]+$", var.notification_topic))
    error_message = "Notification topic must be empty or contain only alphanumeric characters, hyphens, and underscores."
  }
}

variable "custom_labels" {
  type        = map(string)
  description = <<-EOF
    Custom labels to apply to retention policy resources for organization and cost tracking.
    
    These labels will be applied to all retention policy resources created by this
    module. Useful for cost allocation, environment identification, and resource
    management automation.
    
    Example:
    {
      environment = "production"
      team        = "platform"
      cost-center = "engineering"
    }
  EOF
  default     = {}

  validation {
    condition = alltrue([
      for k, v in var.custom_labels : can(regex("^[a-z0-9\\-_]+$", k)) && can(regex("^[a-zA-Z0-9\\-_\\s]+$", v))
    ])
    error_message = "Label keys must be lowercase alphanumeric with hyphens/underscores, values can include spaces."
  }
}