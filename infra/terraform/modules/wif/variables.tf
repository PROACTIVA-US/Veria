# Input variables for the Workload Identity Federation module
# These variables enable configuration of the WIF setup for different environments and repositories

variable "project_id" {
  description = "GCP Project ID where the WIF resources will be created"
  type        = string
  validation {
    condition     = length(var.project_id) > 0
    error_message = "Project ID must be provided and cannot be empty."
  }
}

variable "repository" {
  description = "GitHub repository in format 'owner/repo' that will authenticate via WIF"
  type        = string
  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.repository))
    error_message = "Repository must be in format 'owner/repo'."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod) for resource naming and identification"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "development", "staging", "stage", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, development, staging, stage, prod, production."
  }
}

# Workload Identity Pool configuration variables
variable "pool_id" {
  description = "Workload Identity Pool ID (must be unique within the project)"
  type        = string
  default     = "github-pool"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.pool_id))
    error_message = "Pool ID must start with a lowercase letter, contain only lowercase letters, numbers, and hyphens, and end with an alphanumeric character."
  }
}

variable "pool_display_name" {
  description = "Human-readable display name for the Workload Identity Pool"
  type        = string
  default     = "GitHub Actions Pool"
}

# Workload Identity Provider configuration variables
variable "provider_id" {
  description = "Workload Identity Provider ID (must be unique within the pool)"
  type        = string
  default     = "github-provider"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.provider_id))
    error_message = "Provider ID must start with a lowercase letter, contain only lowercase letters, numbers, and hyphens, and end with an alphanumeric character."
  }
}

variable "provider_display_name" {
  description = "Human-readable display name for the Workload Identity Provider"
  type        = string
  default     = "GitHub OIDC Provider"
}

# Attribute condition for branch and repository restrictions
variable "attribute_condition" {
  description = "CEL expression for attribute-based access control (e.g., branch restrictions). Example: 'attribute.ref==\"refs/heads/main\"' to restrict to main branch only"
  type        = string
  default     = null
  
  validation {
    condition = var.attribute_condition == null || (
      var.attribute_condition != "" && 
      can(regex("attribute\\.", var.attribute_condition))
    )
    error_message = "Attribute condition must be null or a non-empty CEL expression referencing attribute fields."
  }
}

# Service Account configuration variables
variable "service_account_id" {
  description = "Service Account ID for CI/CD operations (must be unique within the project)"
  type        = string
  default     = "github-actions-ci"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.service_account_id)) && length(var.service_account_id) <= 30
    error_message = "Service Account ID must be 30 characters or less, start with a lowercase letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "service_account_display_name" {
  description = "Human-readable display name for the CI/CD service account"
  type        = string
  default     = "GitHub Actions CI/CD"
}

# IAM roles to grant to the service account
variable "service_account_roles" {
  description = "List of IAM roles to grant to the service account for CI/CD operations"
  type        = list(string)
  default = [
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer"
  ]
  
  validation {
    condition = alltrue([
      for role in var.service_account_roles : can(regex("^roles/", role))
    ])
    error_message = "All roles must start with 'roles/' prefix."
  }
}

# Additional APIs to enable (beyond the core WIF APIs)
variable "additional_apis" {
  description = "Additional GCP APIs to enable for the CI/CD service account operations"
  type        = list(string)
  default = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com"
  ]
  
  validation {
    condition = alltrue([
      for api in var.additional_apis : can(regex("\\.googleapis\\.com$", api))
    ])
    error_message = "All APIs must end with '.googleapis.com'."
  }
}

# Branch pattern for environment-specific access control
variable "branch_pattern" {
  description = "Git branch pattern for this environment (e.g., 'refs/heads/main', 'refs/heads/staging'). Used to auto-generate attribute_condition if not explicitly provided."
  type        = string
  default     = "refs/heads/main"
  
  validation {
    condition     = can(regex("^refs/heads/", var.branch_pattern))
    error_message = "Branch pattern must start with 'refs/heads/' to match GitHub OIDC token format."
  }
}