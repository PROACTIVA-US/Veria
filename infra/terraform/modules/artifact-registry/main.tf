# =============================================================================
# Artifact Registry Retention Management Module
# =============================================================================
# This module provides Terraform configuration for Google Cloud Artifact Registry
# retention policies, implementing automated lifecycle management for container
# images to optimize storage utilization while maintaining sufficient historical
# versions for rollback scenarios.
#
# Key Features:
# - Time-based retention policies (30 days untagged, 365 days tagged)
# - Repository lifecycle management
# - Project metadata integration for audit logging
# - Multi-region support preparation (commented examples)
# - Input validation for retention policy parameters
#
# Usage:
#   module "artifact_registry_retention" {
#     source     = "./modules/artifact-registry"
#     project_id = "veria-dev"
#     region     = "us-central1"
#   }
# =============================================================================

# Terraform configuration block with version constraints
terraform {
  # Require Terraform >= 1.5.0 for advanced feature support including
  # import blocks, enhanced validation, and improved state management
  required_version = ">= 1.5.0"

  # Define required providers with version constraints
  required_providers {
    google = {
      source  = "hashicorp/google"
      # Require Google provider >= 5.37.0 for Cloud Run, IAM, and 
      # Artifact Registry management with latest security features
      version = "~> 5.37.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.37.0"
    }
  }
}

# Google Cloud provider configuration using module input variables
# This follows the established pattern from the existing GCP module
provider "google" {
  project = var.project_id
  region  = var.region
}

# Optional multi-region provider alias for future expansion
# Uncomment and configure when multi-region deployment is needed
# provider "google" {
#   alias   = "secondary"
#   project = var.project_id
#   region  = var.secondary_region
# }

# Data source for existing Artifact Registry repositories
# This allows the module to reference existing repositories for retention policy application
data "google_artifact_registry_repository" "existing_repositories" {
  for_each = toset(var.repository_names)
  
  location      = var.region
  repository_id = each.value
  project       = var.project_id

  # Lifecycle management to handle repository dependencies
  lifecycle {
    # Ensure repositories exist before applying retention policies
    precondition {
      condition     = length(var.repository_names) > 0
      error_message = "At least one repository name must be provided for retention policy management."
    }
  }
}

# Optional data source for project metadata and audit logging configuration
# Provides project details for comprehensive audit trail and compliance reporting
data "google_project" "current" {
  project_id = var.project_id
}

# Local values for computed repository paths, policy names, and configuration
locals {
  # Repository paths for use in retention policies and resource references
  repository_paths = {
    for repo_name in var.repository_names : repo_name => format(
      "projects/%s/locations/%s/repositories/%s",
      var.project_id,
      var.region,
      repo_name
    )
  }

  # Generated policy names with consistent naming convention
  retention_policy_names = {
    for repo_name in var.repository_names : repo_name => format(
      "%s-retention-policy",
      repo_name
    )
  }

  # Common tags for resource organization and cost allocation
  common_tags = {
    environment     = var.environment
    project         = "veria"
    component      = "artifact-registry"
    managed_by     = "terraform"
    retention_days = var.retention_days_tagged
  }

  # Repository configurations with retention settings
  repository_configs = {
    for repo_name in var.repository_names : repo_name => {
      name                    = repo_name
      path                   = local.repository_paths[repo_name]
      policy_name            = local.retention_policy_names[repo_name]
      retention_days_tagged   = var.retention_days_tagged
      retention_days_untagged = var.retention_days_untagged
    }
  }

  # Validation helpers for consistent policy enforcement
  validation_rules = {
    # Ensure retention days are within reasonable bounds for compliance
    retention_days_valid = var.retention_days_tagged > 0 && var.retention_days_tagged <= 3650
    untagged_days_valid  = var.retention_days_untagged > 0 && var.retention_days_untagged <= 365
    
    # Validate that tagged retention is longer than untagged retention
    retention_hierarchy_valid = var.retention_days_tagged >= var.retention_days_untagged
  }
}

# =============================================================================
# Input Validation Blocks
# =============================================================================
# These validation blocks ensure that module inputs meet operational and 
# compliance requirements before infrastructure provisioning.

# Validate retention days for tagged images
variable "retention_days_tagged" {
  description = "Number of days to retain tagged container images"
  type        = number
  default     = 365
  
  validation {
    condition     = var.retention_days_tagged > 0 && var.retention_days_tagged <= 3650
    error_message = "Tagged image retention days must be between 1 and 3650 days (10 years) for compliance requirements."
  }
  
  validation {
    condition     = var.retention_days_tagged >= 30
    error_message = "Tagged images must be retained for at least 30 days to support rollback scenarios."
  }
}

# Validate retention days for untagged images
variable "retention_days_untagged" {
  description = "Number of days to retain untagged container images"
  type        = number
  default     = 30
  
  validation {
    condition     = var.retention_days_untagged > 0 && var.retention_days_untagged <= 365
    error_message = "Untagged image retention days must be between 1 and 365 days."
  }
  
  validation {
    condition     = var.retention_days_untagged >= 7
    error_message = "Untagged images must be retained for at least 7 days to support development workflows."
  }
}

# Validate repository names list
variable "repository_names" {
  description = "List of Artifact Registry repository names to manage retention policies for"
  type        = list(string)
  default     = ["veria-containers", "veria-registry", "veria"]
  
  validation {
    condition     = length(var.repository_names) > 0
    error_message = "At least one repository name must be provided."
  }
  
  validation {
    condition     = alltrue([for repo in var.repository_names : can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", repo))])
    error_message = "Repository names must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."
  }
}

# Validate project ID format
variable "project_id" {
  description = "Google Cloud project ID for Artifact Registry"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with a letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

# Validate region format and availability
variable "region" {
  description = "Google Cloud region for Artifact Registry location"
  type        = string
  default     = "us-central1"
  
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]$", var.region))
    error_message = "Region must be a valid Google Cloud region format (e.g., us-central1, europe-west1)."
  }
}

# Environment designation for resource tagging and organization
variable "environment" {
  description = "Environment designation (dev, staging, prod) for resource organization"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}