terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
}
provider "google" { project = var.gcp_project, region = var_gcp_region }
provider "cloudflare" { api_token = var.cloudflare_api_token }

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
