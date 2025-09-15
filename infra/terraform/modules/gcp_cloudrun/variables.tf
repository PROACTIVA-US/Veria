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
