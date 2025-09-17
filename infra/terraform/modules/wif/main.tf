# Workload Identity Federation Module
# Creates WIF pool, OIDC provider, and service account for GitHub Actions authentication
# Supports configurable branch conditions for environment separation

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.37.0"
    }
  }
}

# Enable required APIs for Workload Identity Federation and additional CI/CD APIs
resource "google_project_service" "wif_apis" {
  project = var.project_id
  for_each = toset(concat([
    "iam.googleapis.com",
    "iamcredentials.googleapis.com", 
    "sts.googleapis.com"
  ], var.additional_apis))
  service            = each.key
  disable_on_destroy = false
  
  timeouts {
    create = "10m"
    update = "10m"
  }
}

# Data source to get project information
data "google_project" "current" {
  project_id = var.project_id
}

# Local values for computed configurations
locals {
  # Auto-generate pool and provider names with environment suffix if not explicitly provided
  pool_id_final = var.pool_id == "github-pool" && var.environment != "dev" ? "${var.pool_id}-${var.environment}" : var.pool_id
  provider_id_final = var.provider_id == "github-provider" && var.environment != "dev" ? "${var.provider_id}-${var.environment}" : var.provider_id
  
  # Auto-generate service account ID with environment suffix if using default
  service_account_id_final = var.service_account_id == "github-actions-ci" && var.environment != "dev" ? "${var.service_account_id}-${var.environment}" : var.service_account_id
  
  # Computed attribute condition with fallback to repository and branch pattern
  effective_attribute_condition = var.attribute_condition != null ? var.attribute_condition : "attribute.repository==\"${var.repository}\" && attribute.ref==\"${var.branch_pattern}\""
}

# Workload Identity Pool for GitHub OIDC authentication
resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.project_id
  workload_identity_pool_id = local.pool_id_final
  display_name              = "${var.pool_display_name} (${var.environment})"
  description               = "OIDC federation pool for ${var.repository} GitHub workflows in ${var.environment} environment"
  disabled                  = false

  depends_on = [google_project_service.wif_apis]
}

# Workload Identity Provider for GitHub OIDC with configurable attribute conditions
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = local.provider_id_final
  display_name                       = "${var.provider_display_name} (${var.environment})"
  description                        = "OIDC provider for GitHub Actions with branch restrictions for ${var.environment} environment"
  disabled                           = false

  # GitHub OIDC issuer configuration
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  # Standard GitHub token attribute mappings
  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository"    = "assertion.repository"
    "attribute.workflow_ref"  = "assertion.workflow_ref"
    "attribute.ref"           = "assertion.ref"
    "attribute.actor"         = "assertion.actor"
  }

  # Configurable attribute condition for repository and branch restrictions
  # This enables environment-specific access control (e.g., main branch for prod, staging branch for staging)
  # Auto-generates condition based on repository and branch_pattern if not explicitly provided
  attribute_condition = local.effective_attribute_condition
}

# Service Account for CI/CD operations with environment-specific naming
resource "google_service_account" "ci_service_account" {
  project      = var.project_id
  account_id   = local.service_account_id_final
  display_name = "${var.service_account_display_name} (${var.environment})"
  description  = "Service account for GitHub Actions CI/CD operations in ${var.environment} environment for repository ${var.repository}"
}

# WorkloadIdentityUser binding to allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.ci_service_account.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/attribute.repository/${var.repository}"

  depends_on = [google_iam_workload_identity_pool_provider.github_provider]
}

# Optional project-level IAM bindings for the service account
# These can be configured through variables to grant necessary permissions
resource "google_project_iam_member" "service_account_roles" {
  for_each = toset(var.service_account_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.ci_service_account.email}"

  depends_on = [google_service_account.ci_service_account]
}