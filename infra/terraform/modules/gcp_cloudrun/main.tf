terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}
provider "google" { project = var.project_id, region = var.region }

resource "google_service_account" "cr_sa" {
  account_id   = "${var.service_name}-sa"
  display_name = "Cloud Run SA for ${var.service_name}"
}

resource "google_cloud_run_v2_service" "svc" {
  name     = var.service_name
  location = var.region
  template {
    service_account = google_service_account.cr_sa.email
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    containers {
      image = var.image
      resources {
        cpu_idle = true
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }
      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
  ingress = "INGRESS_TRAFFIC_ALL"
}

resource "google_cloud_run_service_iam_member" "unauth" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = google_cloud_run_v2_service.svc.location
  project  = var.project_id
  service  = google_cloud_run_v2_service.svc.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
