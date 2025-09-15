terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}
provider "google" { project = var.project_id, region = var.region }

resource "google_artifact_registry_repository" "containers" {
  count         = var.create_artifact_registry ? 1 : 0
  location      = var.region
  repository_id = "veria-containers"
  description   = "Container images for Veria"
  format        = "DOCKER"
}

resource "google_compute_network" "veria_vpc" {
  count = var.create_network ? 1 : 0
  name  = "veria-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "veria_subnet" {
  count         = var.create_network ? 1 : 0
  name          = "veria-subnet-${var.region}"
  ip_cidr_range = "10.20.0.0/20"
  region        = var.region
  network       = google_compute_network.veria_vpc[0].self_link
}
