output "workload_identity_provider" {
  description = "The full resource name of the Workload Identity Provider"
  value       = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github_provider.workload_identity_pool_provider_id}"
}

output "service_account_email" {
  description = "The email address of the deployer service account"
  value       = google_service_account.veria_deployer.email
}