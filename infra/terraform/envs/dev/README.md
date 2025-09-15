# Dev Environment

- Baseline infra (Artifact Registry + VPC) + optional Cloud Run.
- Copy `dev.auto.tfvars.example` → `dev.auto.tfvars` and set values.
- `terraform init && terraform validate && terraform plan`
- Turn on `enable_cloud_run` only after an image exists in Artifact Registry.
