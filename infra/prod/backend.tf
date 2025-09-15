terraform {
  backend "gcs" {
    bucket = "veria-prod-tfstate"
    prefix = "terraform/state"
  }
}
