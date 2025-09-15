# Blitzy Setup — Veria (dev)

## Constants
- PROJECT_ID: `veria-dev`
- REGION: `us-central1`
- AR_REPO: `veria`

## One-time local sanity
```bash
./scripts/verify-all.sh || true
# Build a real image for dev deploy
gcloud builds submit --tag us-central1-docker.pkg.dev/veria-dev/veria/veria-hello:latest services/hello
```

## Terraform apply (dev)
```bash
terraform -chdir=infra/dev init
terraform -chdir=infra/dev apply -var-file=dev.tfvars -auto-approve
```

## Expected outputs
* Cloud Run URL printed as `hello_url`
* (Optional) map DNS later via Cloudflare

## CI/CD (Blitzy to create)
* build-and-deploy-dev: build `services/hello`, push to AR, deploy Cloud Run
* terraform-dev: plan+apply in `infra/dev`