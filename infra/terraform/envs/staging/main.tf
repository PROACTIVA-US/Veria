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

# Core GCP infrastructure module
module "gcp" {
  source                  = "../../modules/gcp"
  project_id              = var.gcp_project
  region                  = var.gcp_region
  create_artifact_registry= var.create_artifact_registry
  create_network          = var.create_network
}

# Cloudflare DNS and CDN configuration
module "cloudflare" {
  source               = "../../modules/cloudflare"
  cloudflare_api_token = var.cloudflare_api_token
  zone                 = var.cloudflare_zone
  root_domain          = var.root_domain
  enable_dns_examples  = var.enable_dns_examples
}

# Cloud Run service deployment
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

# Workload Identity Federation module for GitHub OIDC authentication
# Enables keyless authentication for staging CI/CD pipeline targeting refs/heads/staging
module "wif" {
  source     = "../../modules/wif"
  project_id = var.gcp_project
  repository = var.github_repository
  
  # Staging-specific branch condition - restricts WIF provider to staging branch
  branch_condition = "refs/heads/staging"
  
  # Service account configuration for staging deployments
  service_account_id          = "veria-staging-automation"
  service_account_display_name = "Veria Staging Automation Service Account"
  
  # WIF pool and provider naming for staging environment
  pool_id         = "github-pool-staging"
  pool_display_name = "GitHub Actions Pool - Staging"
  provider_id     = "github-provider-staging"
  provider_display_name = "GitHub Actions Provider - Staging"
}

# Outputs for service URLs and WIF configuration
output "cloud_run_url" {
  value       = var.enable_cloud_run ? module.cloudrun[0].service_url : null
  description = "Cloud Run service URL when enabled"
}

# WIF provider configuration for GitHub Actions workflows
output "wif_provider" {
  value       = module.wif.workload_identity_provider
  description = "Workload Identity Federation provider for GitHub Actions authentication"
  sensitive   = false
}

# Service account for staging deployments
output "wif_service_account" {
  value       = module.wif.service_account_email
  description = "Service account email for staging deployments via WIF"
  sensitive   = false
}

# Pool ID for reference and debugging
output "wif_pool_id" {
  value       = module.wif.pool_id
  description = "Workload Identity Federation pool ID for staging"
  sensitive   = false
}