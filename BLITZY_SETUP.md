# Blitzy Setup — Veria (dev)

## Constants (dev)
- PROJECT_ID: `veria-dev`
- REGION: `us-central1`
- AR_REPO: `veria`        # Artifact Registry repo name (docker)
- SERVICE_NAME: `veria-hello`

## Required GitHub Action Secrets (set before Blitzy runs CI)
- `GCP_SA_KEY`           # JSON for a Service Account with: roles/run.admin, roles/artifactregistry.writer, roles/iam.serviceAccountUser
- `GCP_PROJECT_ID=veria-dev`
- `GCP_REGION=us-central1`
- `GAR_REPO=veria`
- (optional) `HEALTH_URL` e.g. `https://<cloud-run-url>/healthz`
- (optional) Cloudflare if mapping DNS later: `CLOUDFLARE_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_ZONE_ID`

> Blitzy will use these to auth and deploy. No local plaintext keys checked in.

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

CI Inputs (GitHub Actions secrets):
  - GCP_SA_KEY (JSON; roles: run.admin, artifactregistry.writer, iam.serviceAccountUser)
  - GCP_PROJECT_ID=veria-dev
  - GCP_REGION=us-central1
  - (optional) GAR_REPO=veria
