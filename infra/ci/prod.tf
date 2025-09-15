# Production WIF Configuration

# Data source for prod project
data "google_project" "prod" {
  project_id = "veria-prod"
}

# Workload Identity Pool for GitHub (Prod)
resource "google_iam_workload_identity_pool" "github_pool_prod" {
  project                   = "veria-prod"
  workload_identity_pool_id = "github-pool-prod"
  display_name              = "GitHub Actions Pool (Prod)"
  description               = "Workload Identity Pool for GitHub Actions - Production"
  disabled                  = false
}

# Workload Identity Provider for GitHub OIDC (Prod)
resource "google_iam_workload_identity_pool_provider" "github_provider_prod" {
  project                             = "veria-prod"
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool_prod.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider-prod"
  display_name                        = "GitHub Provider (Prod)"
  description                         = "OIDC provider for GitHub Actions - Production"
  disabled                            = false

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.actor"      = "assertion.actor"
  }
}

# Service Account for deployment (Prod)
resource "google_service_account" "veria_deployer_prod" {
  project      = "veria-prod"
  account_id   = "veria-deployer-prod"
  display_name = "Veria Prod Deployer"
  description  = "Service account for GitHub Actions deployment - Production"
}

# Allow the Workload Identity Pool to impersonate the Service Account (Prod)
resource "google_service_account_iam_member" "workload_identity_user_prod" {
  service_account_id = google_service_account.veria_deployer_prod.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.prod.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool_prod.workload_identity_pool_id}/attribute.repository/${var.repository}"
}

# Grant Cloud Run Admin role to the Service Account (Prod)
resource "google_project_iam_member" "run_admin_prod" {
  project = "veria-prod"
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.veria_deployer_prod.email}"
}

# Grant Service Account User role to the Service Account (Prod)
resource "google_project_iam_member" "service_account_user_prod" {
  project = "veria-prod"
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.veria_deployer_prod.email}"
}

# Grant Artifact Registry Writer role to the Service Account (Prod)
resource "google_project_iam_member" "artifactregistry_writer_prod" {
  project = "veria-prod"
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.veria_deployer_prod.email}"
}

# Outputs for prod
output "workload_identity_provider_prod" {
  description = "The full resource name of the Workload Identity Provider for Production"
  value       = "projects/${data.google_project.prod.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool_prod.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github_provider_prod.workload_identity_pool_provider_id}"
}

output "deployer_service_account_prod" {
  description = "The email address of the deployer service account for Production"
  value       = google_service_account.veria_deployer_prod.email
}