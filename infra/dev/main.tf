# Enable required APIs
locals {
  required_apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "secretmanager.googleapis.com"
  ]
}

resource "google_project_service" "required" {
  for_each           = toset(local.required_apis)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# Cloud Run service using a prebuilt image
resource "google_cloud_run_v2_service" "hello" {
  name     = "veria-hello"
  location = var.region

  template {
    containers {
      image = var.service_image
      ports {
        name           = "http1"
        container_port = 8080
      }
    }
  }

  depends_on = [google_project_service.required]
}

# Dan invoker (when public_access is false)
resource "google_cloud_run_v2_service_iam_member" "dan_invoker" {
  count    = var.public_access ? 0 : 1
  location = var.region
  name     = google_cloud_run_v2_service.hello.name
  role     = "roles/run.invoker"
  member   = "user:dan@proactiva.us"
}

# Public invoker (when public_access is true)
resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.public_access ? 1 : 0
  location = var.region
  name     = google_cloud_run_v2_service.hello.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}