# Workload Identity Federation Module Outputs
# Provides resource names and identifiers for GitHub Actions authentication
# and advanced configuration use cases

output "workload_identity_provider" {
  description = "The full resource name of the Workload Identity Provider for use with google-github-actions/auth@v2. This value should be used as the workload_identity_provider parameter in GitHub Actions workflows."
  value       = "projects/${var.project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.pool.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.provider.workload_identity_pool_provider_id}"
}

output "service_account_email" {
  description = "The email address of the service account associated with this Workload Identity Federation setup. Use this for IAM role assignments and Cloud Run service account bindings."
  value       = google_service_account.service_account.email
}

output "pool_id" {
  description = "The ID of the Workload Identity Pool. Useful for referencing the pool in other Terraform modules or for advanced configuration scenarios."
  value       = google_iam_workload_identity_pool.pool.workload_identity_pool_id
}

output "provider_id" {
  description = "The ID of the Workload Identity Pool Provider. Useful for referencing the provider in other Terraform modules or for debugging authentication issues."
  value       = google_iam_workload_identity_pool_provider.provider.workload_identity_pool_provider_id
}

output "project_number" {
  description = "The GCP project number used in this configuration. Useful for constructing resource names and for advanced IAM configurations."
  value       = var.project_number
}