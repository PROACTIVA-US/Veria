terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "veria-dev"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "repository" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "PROACTIVA-US/Veria"
}

data "google_project" "current" {}

# Enable required APIs
resource "google_project_service" "enable_services" {
  project = var.project_id
  for_each = toset([
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

# Workload Identity Pool for GitHub
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "OIDC federation for PROACTIVA-US GitHub workflows"
  disabled                  = false

  depends_on = [google_project_service.enable_services]
}

# Workload Identity Provider for GitHub OIDC
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"
  disabled                           = false

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository"    = "assertion.repository"
    "attribute.workflow_ref"  = "assertion.workflow_ref"
    "attribute.ref"           = "assertion.ref"
    "attribute.actor"         = "assertion.actor"
  }
}

# Service Account for deployment
resource "google_service_account" "veria_deployer" {
  account_id   = "veria-deployer"
  display_name = "Veria Dev Deployer"
  description  = "Service account for GitHub Actions deployment"
}

# Allow the Workload Identity Pool to impersonate the Service Account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.veria_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/attribute.repository/${var.repository}"
}

# Grant Cloud Run Admin role to the Service Account
resource "google_project_iam_member" "run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.veria_deployer.email}"
}

# Grant Service Account User role to the Service Account
resource "google_project_iam_member" "service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.veria_deployer.email}"
}

# Grant Artifact Registry Writer role to the Service Account
resource "google_project_iam_member" "artifactregistry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.veria_deployer.email}"
}