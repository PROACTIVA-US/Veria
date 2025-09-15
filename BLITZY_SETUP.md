# Blitzy Setup — Veria (dev)

## Constants (dev)
- PROJECT_ID: `veria-dev`
- REGION: `us-central1`
- AR_REPO: `veria`        # Artifact Registry repo name (docker)
- SERVICE_NAME: `veria-hello`

## Required GitHub Action Secrets (set before Blitzy runs CI)
- `GCP_WIF_PROVIDER` - Workload Identity Provider resource name
- `GCP_WIF_SERVICE_ACCOUNT` - Service account email for deployment

> Using Workload Identity Federation (WIF) for keyless auth - no JSON keys needed.

---

## One-time local sanity (dev)
```bash
# from repo root
./scripts/verify-all.sh || true

# Build a real image for dev deploy (manual smoke)
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/veria-dev/veria/veria-hello:latest \
  services/hello

## Blitzy Quickstart (dev, private)

Service: veria-hello (region: us-central1)
Image: us-central1-docker.pkg.dev/veria-dev/veria/veria-hello:<sha or @digest>
Arch: linux/amd64

Auth: Private Cloud Run. Use Google ID token.

Health:
  Path: /_ah/health  -> 200 "ok"

Smoke (from a dev machine with gcloud):
  SERVICE_URL=$(gcloud run services describe veria-hello --region us-central1 --format='value(status.url)')
  ID_TOKEN=$(gcloud auth print-identity-token)
  curl -i -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/_ah/health"

Terraform outputs:
  - hello_url
  - health_url

## CI/CD (Dev)

### Workflow
- File: `.github/workflows/build-deploy-smoke-dev.yml`
- Auth: **Workload Identity Federation** via GitHub OIDC (keyless)
- Triggers: push to main, manual dispatch

### Pipeline Steps
1. Build linux/amd64 image with Docker Buildx
2. Push to Artifact Registry: `us-central1-docker.pkg.dev/veria-dev/veria/veria-hello:<git-sha>`
3. Deploy Cloud Run service `veria-hello` **by digest** (not :latest)
4. Run smoke test via `scripts/blitzy-smoke.sh` → hits `/_ah/health`

### Required GitHub Secrets
- `GCP_WIF_PROVIDER`: Workload Identity Provider resource name
- `GCP_WIF_SERVICE_ACCOUNT`: Deployer service account email

### Terraform Outputs
- `hello_url`: Cloud Run service URL
- `health_url`: Service URL + `/_ah/health`

### Health Check
- Path: `/_ah/health`
- Response: HTTP 200 with body "ok"
- Auth: Private service, requires Google ID token

---

## CI/CD (Prod)

### Workflow
- File: `.github/workflows/build-deploy-smoke-prod.yml`
- Auth: **Workload Identity Federation** via GitHub OIDC (keyless)
- Project: `veria-prod`
- Triggers: push to main, manual dispatch

### Pipeline Steps
1. Build linux/amd64 image with Docker Buildx
2. Push to Artifact Registry: `us-central1-docker.pkg.dev/veria-prod/veria/veria-hello:<git-sha>`
3. Deploy Cloud Run service `veria-hello` **by digest** (not :latest)
4. Run smoke test via `scripts/blitzy-smoke.sh` → hits `/_ah/health`

### Required GitHub Secrets
- `GCP_WIF_PROVIDER_PROD`: Workload Identity Provider resource name for prod
- `GCP_WIF_SERVICE_ACCOUNT_PROD`: Deployer service account email for prod

### Terraform Outputs
- `hello_url`: Cloud Run service URL
- `health_url`: Service URL + `/_ah/health`

### Health Check
- Path: `/_ah/health`
- Response: HTTP 200 with body "ok"
- Auth: Private service, requires Google ID token
