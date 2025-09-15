variable "project_id" { type = string }
variable "region" { type = string }
variable "artifact_repo" { type = string }
variable "service_image" { type = string }

variable "public_access" {
  type        = bool
  default     = false
  description = "Grant allUsers invoker (may be blocked by org policy)"
}