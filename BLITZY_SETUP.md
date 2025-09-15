# Blitzy Setup — Veria (dev)

## Constants
- PROJECT_ID: `veria-dev`
- REGION: `us-central1`
- AR_REPO: `veria`
- SERVICE_NAME: `veria-hello`

## One-time local sanity
```bash
# Verify setup
./scripts/verify-all.sh || true

# Images must be built for linux/amd64
```

## Build & Push (local)
```bash
# Build and push linux/amd64 image with buildx
docker buildx build \
  --platform linux/amd64 \
  --tag us-central1-docker.pkg.dev/veria-dev/veria/veria-hello:$(git rev-parse --short HEAD) \
  --push \
  services/hello

# Get digest for deployment (avoid :latest drift)
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/veria-dev/veria/veria-hello:$(git rev-parse --short HEAD) \
  --format='get(image_summary.digest)'
```
**Note:** Always deploy by digest (@sha256:...) to avoid :latest drift

## Terraform (dev)
```bash
terraform -chdir=infra/dev init
terraform -chdir=infra/dev apply -var-file=dev.tfvars -auto-approve
```
Outputs: `hello_url`, `health_url`

## Access model (PRIVATE)
Service requires Google ID token for invocation:
```bash
SERVICE_URL=$(gcloud run services describe veria-hello --region us-central1 --format='value(status.url)')
ID_TOKEN=$(gcloud auth print-identity-token)
curl -i -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/_ah/health"
```

## Health & Smoke
- Health endpoint: `/_ah/health` → 200 "ok"
- Smoke script: `scripts/blitzy-smoke.sh` (uses gcloud user ID token)

## CI/CD (Dev)
- Workflow: `.github/workflows/build-deploy-smoke-dev.yml`
- Auth: **Workload Identity Federation (GitHub OIDC)**, no JSON keys
- Workflow permissions: `id-token: write`, `contents: read`
- Steps:
  1. Buildx → **linux/amd64**
  2. Push AR with commit SHA tag
  3. Resolve **@digest** and deploy Cloud Run by digest
  4. Smoke `/_ah/health`
- Required repo secrets:
  - `GCP_WIF_PROVIDER` (e.g., `projects/<number>/locations/global/workloadIdentityPools/github-pool/providers/github-provider`)
  - `GCP_WIF_SERVICE_ACCOUNT` (e.g., `veria-deployer@veria-dev.iam.gserviceaccount.com`)

## Prod
- PROJECT_ID: `veria-prod` (same region/service)
- Workflow: `.github/workflows/build-deploy-smoke-prod.yml`
- Required prod secrets: `GCP_WIF_PROVIDER_PROD`, `GCP_WIF_SERVICE_ACCOUNT_PROD`
- Same health/smoke conventions

## Troubleshooting
- **Image not found** → push to AR or use digest
- **amd64 required** → build with buildx `--platform linux/amd64`
- **Private 401** → use ID token; verify invoker IAM
- **Startup timeout** → ensure server listens on `$PORT` (8080)