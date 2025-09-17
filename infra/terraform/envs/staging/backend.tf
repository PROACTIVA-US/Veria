terraform {
  required_version = ">= 1.5.0"
  backend "gcs" {
    bucket = "veria-terraform-state"
    prefix = "envs/staging"
  }
}