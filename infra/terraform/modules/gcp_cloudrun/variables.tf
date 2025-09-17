variable "project_id" { type = string }
variable "region" { type = string, default = "us-central1" }
variable "service_name" { type = string }
variable "image" { type = string }
variable "env" {
  type = map(string)
  default = {}
}
variable "min_instances" { type = number, default = 0 }
variable "max_instances" { type = number, default = 3 }
variable "cpu" { type = string, default = "1" }
variable "memory" { type = string, default = "512Mi" }
variable "allow_unauthenticated" { type = bool, default = true }

# Workload Identity Federation variables
variable "wif_service_account_email" {
  type        = string
  default     = null
  description = "Service account email from the WIF module for WorkloadIdentityUser IAM binding"
}

variable "wif_enabled" {
  type        = bool
  default     = false
  description = "Enable WorkloadIdentityUser IAM bindings for Workload Identity Federation"
}

# Environment and configuration variables
variable "environment" {
  type        = string
  default     = null
  description = "Environment name for environment-specific configurations"
}

variable "secret_env" {
  type        = map(string)
  default     = {}
  description = "Map of environment variable names to Secret Manager secret names"
}
