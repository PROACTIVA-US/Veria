# ==============================================================================
# IAM Configuration for Workload Identity Federation Support
# ==============================================================================
# This file implements WorkloadIdentityUser IAM bindings to enable keyless
# CI/CD authentication from GitHub Actions to Cloud Run service accounts.
# 
# The WorkloadIdentityUser role allows the GitHub Actions service account
# (configured through Workload Identity Federation) to impersonate the 
# Cloud Run service account for deployments without requiring JSON keys.
#
# This binding is conditional based on the wif_enabled variable, allowing
# modules to opt into WIF authentication when needed for enhanced security.
# ==============================================================================

# WorkloadIdentityUser IAM binding for keyless GitHub Actions authentication
resource "google_service_account_iam_member" "workload_identity_user" {
  # Only create this binding when WIF is enabled and service account email is provided
  count = var.wif_enabled && var.wif_service_account_email != null ? 1 : 0

  # Target the Cloud Run service account created in main.tf
  service_account_id = google_service_account.cr_sa.name
  
  # Grant WorkloadIdentityUser role to allow impersonation
  role = "roles/iam.workloadIdentityUser"
  
  # Bind to the WIF service account that will perform the impersonation
  # Format: serviceAccount:{email} for direct service account binding
  member = "serviceAccount:${var.wif_service_account_email}"
}

# ==============================================================================
# Technical Implementation Notes:
# ==============================================================================
# 1. Conditional Creation: Uses count to conditionally create the IAM binding
#    only when both wif_enabled=true and wif_service_account_email is provided.
#
# 2. Member Format: Uses "serviceAccount:${email}" format for direct service
#    account to service account impersonation binding, which is the correct
#    format for WorkloadIdentityUser role assignments.
#
# 3. Security Model: This enables the GitHub Actions workflow (running with
#    the WIF service account identity) to impersonate the Cloud Run service
#    account for deployment operations, eliminating the need for JSON keys.
#
# 4. Environment Support: Works with both development and staging environments
#    through the configurable wif_service_account_email parameter, allowing
#    different WIF service accounts per environment with appropriate branch
#    conditions configured in the WIF provider.
#
# 5. Backward Compatibility: The conditional creation ensures existing module
#    consumers are not affected unless they explicitly enable WIF support.
# ==============================================================================