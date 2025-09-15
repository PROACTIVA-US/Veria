variable "project_id" { type = string }
variable "region" { type = string, default = "us-central1" }
variable "create_artifact_registry" { type = bool, default = true }
variable "create_network" { type = bool, default = true }
