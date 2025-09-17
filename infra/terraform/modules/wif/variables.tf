# =================================================================
# Workload Identity Federation Module Variables
# =================================================================
# Input variables for the Workload Identity Federation module.
# Defines parameters for GCP project configuration, GitHub repository
# details, branch conditions for environment separation, pool and
# provider naming, service account configuration, and optional API
# enablement. All variables include appropriate types, descriptions,
# and sensible defaults where applicable.
#
# This module enables reusable WIF configurations across multiple
# environments (dev, staging, prod) with customizable naming and
# branch-based access restrictions.
# =================================================================

# -----------------------------------------------------------------
# GCP Project Configuration
# -----------------------------------------------------------------

variable "project_id" {
  description = "GCP Project ID where WIF resources will be created"
  type        = string
  default     = "veria-dev"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.project_id))
    error_message = "Project ID must start with a lowercase letter, contain only lowercase letters, numbers, and hyphens, and end with a lowercase letter or number."
  }
}

variable "region" {
  description = "GCP Region for resource deployment (affects resource naming and location constraints)"
  type        = string
  default     = "us-central1"

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]+$", var.region))
    error_message = "Region must be in valid GCP region format (e.g., us-central1, europe-west1)."
  }
}

# -----------------------------------------------------------------
# GitHub Integration Configuration
# -----------------------------------------------------------------

variable "repository" {
  description = "GitHub repository in format owner/repo for OIDC integration"
  type        = string
  default     = "PROACTIVA-US/Veria"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.repository))
    error_message = "Repository must be in format 'owner/repo' using valid GitHub naming conventions."
  }
}

variable "attribute_condition" {
  description = "Branch/tag condition for environment-specific access restrictions (e.g., 'refs/heads/main', 'refs/heads/staging'). Empty string allows all branches."
  type        = string
  default     = ""

  validation {
    condition = var.attribute_condition == "" || can(regex("^refs/(heads|tags)/[A-Za-z0-9_./\\-]+$", var.attribute_condition))
    error_message = "Attribute condition must be empty or match Git refs format like 'refs/heads/main' or 'refs/tags/v1.0'."
  }
}

# -----------------------------------------------------------------
# WIF Pool and Provider Configuration
# -----------------------------------------------------------------

variable "pool_id" {
  description = "Workload Identity Pool ID for multi-environment support. Must be unique within the project."
  type        = string
  default     = "github-pool"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.pool_id)) && length(var.pool_id) <= 32
    error_message = "Pool ID must start with lowercase letter, contain only lowercase letters, numbers, and hyphens, end with letter or number, and be max 32 characters."
  }
}

variable "provider_id" {
  description = "Workload Identity Provider ID for GitHub OIDC integration. Must be unique within the pool."
  type        = string
  default     = "github-provider"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.provider_id)) && length(var.provider_id) <= 32
    error_message = "Provider ID must start with lowercase letter, contain only lowercase letters, numbers, and hyphens, end with letter or number, and be max 32 characters."
  }
}

# -----------------------------------------------------------------
# Service Account Configuration
# -----------------------------------------------------------------

variable "service_account_name" {
  description = "Service Account ID for deployment operations. Must be unique within the project."
  type        = string
  default     = "veria-deployer"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.service_account_name)) && length(var.service_account_name) <= 30 && length(var.service_account_name) >= 6
    error_message = "Service account name must be 6-30 characters, start with lowercase letter, contain only lowercase letters, numbers, and hyphens, and end with letter or number."
  }
}

variable "service_account_display_name" {
  description = "Human-readable display name for the service account"
  type        = string
  default     = "Veria Deployer"

  validation {
    condition     = length(var.service_account_display_name) <= 100
    error_message = "Service account display name must be 100 characters or less."
  }
}

variable "service_account_description" {
  description = "Description of the service account's purpose and permissions"
  type        = string
  default     = "Service account for GitHub Actions deployment with WIF authentication"

  validation {
    condition     = length(var.service_account_description) <= 256
    error_message = "Service account description must be 256 characters or less."
  }
}

# -----------------------------------------------------------------
# Environment and Naming Configuration
# -----------------------------------------------------------------

variable "environment" {
  description = "Environment identifier for resource naming and descriptions (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.environment))
    error_message = "Environment must contain only lowercase letters, numbers, and hyphens, starting and ending with alphanumeric characters."
  }
}

# -----------------------------------------------------------------
# Optional API Management
# -----------------------------------------------------------------

variable "enable_apis" {
  description = "Whether to enable required GCP APIs. Set to false if APIs are managed externally."
  type        = bool
  default     = true
}

variable "required_apis" {
  description = "List of GCP APIs required for WIF functionality"
  type        = list(string)
  default = [
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com"
  ]

  validation {
    condition     = length(var.required_apis) > 0
    error_message = "At least one API must be specified in the required_apis list."
  }
}

# -----------------------------------------------------------------
# Advanced Configuration
# -----------------------------------------------------------------

variable "disable_dependent_services" {
  description = "Whether to disable dependent services when destroying resources. Use with caution in shared projects."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Resource tags for organization and cost tracking"
  type        = map(string)
  default     = {}

  validation {
    condition     = length(var.tags) <= 64
    error_message = "Maximum of 64 tags allowed per resource."
  }
}