variable "gcp_project" {}
variable "gcp_region" { default = "us-central1" }

variable "cloudflare_api_token" { sensitive = true }
variable "cloudflare_zone" {}
variable "root_domain" {}

variable "create_artifact_registry" { type = bool, default = true }
variable "create_network" { type = bool, default = true }
variable "enable_dns_examples" { type = bool, default = false }

# Cloud Run toggles
variable "enable_cloud_run" { type = bool, default = false }
variable "cr_service_name" { type = string, default = "veria-web" }
variable "cr_image" { type = string, default = "" }
variable "cr_env" { type = map(string), default = {} }
variable "cr_min_instances" { type = number, default = 0 }
variable "cr_max_instances" { type = number, default = 3 }
variable "cr_cpu" { type = string, default = "1" }
variable "cr_memory" { type = string, default = "512Mi" }
variable "cr_allow_unauthenticated" { type = bool, default = true }
