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

# Data sources for Secret Manager secrets
data "google_secret_manager_secret_version" "secrets" {
  for_each = var.secret_env_vars != null ? var.secret_env_vars : {}
  secret   = each.value.secret_name
  version  = each.value.version != null ? each.value.version : "latest"
}

data "google_secret_manager_secret_version" "secret_files" {
  for_each = var.secret_volumes != null ? var.secret_volumes : {}
  secret   = each.value.secret_name
  version  = each.value.version != null ? each.value.version : "latest"
}

resource "google_cloud_run_v2_service" "svc" {
  name     = var.service_name
  location = var.region
  
  # Environment-specific labels and annotations
  labels = merge(
    var.labels != null ? var.labels : {},
    var.environment != null ? {
      "environment" = var.environment
    } : {}
  )
  
  annotations = merge(
    var.annotations != null ? var.annotations : {},
    var.environment != null ? {
      "veria.ai/environment" = var.environment
    } : {}
  )
  template {
    service_account = google_service_account.cr_sa.email
    # Environment-specific template labels and annotations
    labels = merge(
      var.template_labels != null ? var.template_labels : {},
      var.environment != null ? {
        "environment" = var.environment
      } : {}
    )
    
    annotations = merge(
      var.template_annotations != null ? var.template_annotations : {},
      var.environment != null ? {
        "veria.ai/environment" = var.environment
      } : {}
    )
    
    # Environment-specific timeout configuration
    timeout = var.request_timeout != null ? var.request_timeout : "300s"
    
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    # Volumes for secret files
    dynamic "volumes" {
      for_each = var.secret_volumes != null ? var.secret_volumes : {}
      content {
        name = volumes.key
        secret {
          secret       = volumes.value.secret_name
          default_mode = volumes.value.mode != null ? volumes.value.mode : 420
          items {
            version = volumes.value.version != null ? volumes.value.version : "latest"
            path    = volumes.value.filename != null ? volumes.value.filename : volumes.key
            mode    = volumes.value.file_mode != null ? volumes.value.file_mode : 420
          }
        }
      }
    }
    containers {
      image = var.image
      # Environment-specific port configuration
      ports {
        container_port = var.container_port != null ? var.container_port : 8080
        name           = var.port_name != null ? var.port_name : "http1"
      }
      resources {
        cpu_idle = var.cpu_idle != null ? var.cpu_idle : true
        startup_cpu_boost = var.startup_cpu_boost != null ? var.startup_cpu_boost : false
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }
      # Environment-specific startup probe
      dynamic "startup_probe" {
        for_each = var.startup_probe != null ? [var.startup_probe] : []
        content {
          initial_delay_seconds = startup_probe.value.initial_delay_seconds != null ? startup_probe.value.initial_delay_seconds : 10
          timeout_seconds       = startup_probe.value.timeout_seconds != null ? startup_probe.value.timeout_seconds : 5
          period_seconds        = startup_probe.value.period_seconds != null ? startup_probe.value.period_seconds : 10
          failure_threshold     = startup_probe.value.failure_threshold != null ? startup_probe.value.failure_threshold : 3
          tcp_socket {
            port = var.container_port != null ? var.container_port : 8080
          }
        }
      }
      # Environment-specific liveness probe  
      dynamic "liveness_probe" {
        for_each = var.liveness_probe != null ? [var.liveness_probe] : []
        content {
          initial_delay_seconds = liveness_probe.value.initial_delay_seconds != null ? liveness_probe.value.initial_delay_seconds : 30
          timeout_seconds       = liveness_probe.value.timeout_seconds != null ? liveness_probe.value.timeout_seconds : 5
          period_seconds        = liveness_probe.value.period_seconds != null ? liveness_probe.value.period_seconds : 30
          failure_threshold     = liveness_probe.value.failure_threshold != null ? liveness_probe.value.failure_threshold : 3
          http_get {
            port = var.container_port != null ? var.container_port : 8080
            path = liveness_probe.value.path != null ? liveness_probe.value.path : "/"
            http_headers = liveness_probe.value.http_headers != null ? liveness_probe.value.http_headers : []
          }
        }
      }
      # Regular environment variables
      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }
      # Secret environment variables from Secret Manager
      dynamic "env" {
        for_each = var.secret_env_vars != null ? var.secret_env_vars : {}
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version != null ? env.value.version : "latest"
            }
          }
        }
      }
      # Volume mounts for secret files
      dynamic "volume_mounts" {
        for_each = var.secret_volumes != null ? var.secret_volumes : {}
        content {
          name       = volume_mounts.key
          mount_path = volume_mounts.value.mount_path
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
