terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

module "gcp" {
  source                  = "../../modules/gcp"
  project_id              = var.gcp_project
  region                  = var.gcp_region
  create_artifact_registry= var.create_artifact_registry
  create_network          = var.create_network
}

module "cloudflare" {
  source               = "../../modules/cloudflare"
  cloudflare_api_token = var.cloudflare_api_token
  zone                 = var.cloudflare_zone
  root_domain          = var.root_domain
  enable_dns_examples  = var.enable_dns_examples
}

module "cloudrun" {
  source                 = "../../modules/gcp_cloudrun"
  count                  = var.enable_cloud_run ? 1 : 0
  project_id             = var.gcp_project
  region                 = var.gcp_region
  service_name           = var.cr_service_name
  image                  = var.cr_image
  env                    = var.cr_env
  min_instances          = var.cr_min_instances
  max_instances          = var.cr_max_instances
  cpu                    = var.cr_cpu
  memory                 = var.cr_memory
  allow_unauthenticated  = var.cr_allow_unauthenticated
}

output "cloud_run_url" {
  value       = var.enable_cloud_run ? module.cloudrun[0].service_url : null
  description = "Cloud Run URL when enabled"
}
