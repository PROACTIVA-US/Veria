# GCP Project Configuration
variable "gcp_project" {}
variable "gcp_region" { default = "us-central1" }

# Cloudflare Configuration
variable "cloudflare_api_token" { sensitive = true }
variable "cloudflare_zone" {}
variable "root_domain" {}

# Infrastructure Toggles
variable "create_artifact_registry" { type = bool, default = true }
variable "create_network" { type = bool, default = true }
variable "enable_dns_examples" { type = bool, default = false }

# Cloud Run Configuration
variable "enable_cloud_run" { type = bool, default = false }
variable "cr_service_name" { type = string, default = "veria-web" }
variable "cr_image" { type = string, default = "" }
variable "cr_env" { type = map(string), default = {} }
variable "cr_min_instances" { type = number, default = 0 }
variable "cr_max_instances" { type = number, default = 5 }  # Updated for staging: increased from 3 to 5
variable "cr_cpu" { type = string, default = "1" }  # Staging: 1 vCPU as specified
variable "cr_memory" { type = string, default = "512Mi" }  # Staging: 512Mi memory as specified
variable "cr_allow_unauthenticated" { type = bool, default = true }

# Workload Identity Federation (WIF) Configuration
variable "github_repository" {
  type        = string
  description = "GitHub repository in the format 'org/repo' for WIF authentication"
  default     = "PROACTIVA-US/Veria"
}

variable "github_organization" {
  type        = string
  description = "GitHub organization name for WIF provider configuration"
  default     = "PROACTIVA-US"
}

variable "wif_branch_condition" {
  type        = string
  description = "Branch condition for WIF provider authentication (refs/heads/staging for staging environment)"
  default     = "refs/heads/staging"
}

variable "wif_pool_id" {
  type        = string
  description = "Workload Identity Federation pool identifier"
  default     = "github-pool"
}

variable "wif_provider_id" {
  type        = string
  description = "Workload Identity Federation provider identifier"
  default     = "github-provider"
}

variable "service_account_id" {
  type        = string
  description = "Service account identifier for GitHub Actions automation"
  default     = "veria-automation"
}