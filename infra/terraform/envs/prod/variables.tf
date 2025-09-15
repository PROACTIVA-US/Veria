variable "gcp_project" {}
variable "gcp_region" { default = "us-central1" }

variable "cloudflare_api_token" { sensitive = true }
variable "cloudflare_zone" {}
variable "root_domain" {}

variable "create_artifact_registry" { type = bool, default = true }
variable "create_network" { type = bool, default = true }
variable "enable_dns_examples" { type = bool, default = false }
