# Output values from the Workload Identity Federation module
# These outputs provide essential information for GitHub Actions workflows and other Terraform modules

# Workload Identity Pool outputs
output "workload_identity_pool_id" {
  description = "The ID of the Workload Identity Pool"
  value       = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
}

output "workload_identity_pool_name" {
  description = "The full resource name of the Workload Identity Pool"
  value       = google_iam_workload_identity_pool.github_pool.name
}

# Workload Identity Provider outputs
output "workload_identity_provider_id" {
  description = "The ID of the Workload Identity Provider"
  value       = google_iam_workload_identity_pool_provider.github_provider.workload_identity_pool_provider_id
}

output "workload_identity_provider_name" {
  description = "The full resource name of the Workload Identity Provider (for use in GitHub Actions workflows)"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

# Service Account outputs
output "service_account_id" {
  description = "The ID of the service account"
  value       = google_service_account.ci_service_account.account_id
}

output "service_account_email" {
  description = "The email address of the service account (for use in GitHub Actions workflows)"
  value       = google_service_account.ci_service_account.email
}

output "service_account_name" {
  description = "The full resource name of the service account"
  value       = google_service_account.ci_service_account.name
}

output "service_account_unique_id" {
  description = "The unique ID of the service account"
  value       = google_service_account.ci_service_account.unique_id
}

# GitHub Actions workflow configuration outputs
output "github_actions_config" {
  description = "Complete configuration object for GitHub Actions workflows using this WIF setup"
  value = {
    workload_identity_provider = google_iam_workload_identity_pool_provider.github_provider.name
    service_account           = google_service_account.ci_service_account.email
    project_id               = var.project_id
    repository               = var.repository
    environment              = var.environment
  }
}

# Project information outputs
output "project_id" {
  description = "The GCP project ID where resources were created"
  value       = var.project_id
}

output "project_number" {
  description = "The GCP project number"
  value       = data.google_project.current.number
}

# Environment and configuration metadata
output "environment" {
  description = "The environment name for this WIF setup"
  value       = var.environment
}

output "repository" {
  description = "The GitHub repository configured for this WIF setup"
  value       = var.repository
}

output "attribute_condition" {
  description = "The attribute condition configured for branch/repository restrictions"
  value       = var.attribute_condition
}

# Full provider resource path for direct use in external configurations
output "provider_resource_path" {
  description = "Complete resource path for the Workload Identity Provider (projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID)"
  value       = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github_provider.workload_identity_pool_provider_id}"
}

# Principal set for IAM bindings
output "principal_set" {
  description = "Principal set identifier for IAM bindings using this WIF setup"
  value       = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/attribute.repository/${var.repository}"
}

# Summary output for operational visibility
output "wif_summary" {
  description = "Summary of the WIF configuration for operational documentation"
  value = {
    pool_id                 = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
    provider_id            = google_iam_workload_identity_pool_provider.github_provider.workload_identity_pool_provider_id
    service_account_email  = google_service_account.ci_service_account.email
    environment           = var.environment
    repository            = var.repository
    attribute_condition   = var.attribute_condition
    enabled_apis         = [
      "iam.googleapis.com",
      "iamcredentials.googleapis.com", 
      "sts.googleapis.com"
    ]
    granted_roles = var.service_account_roles
  }
}