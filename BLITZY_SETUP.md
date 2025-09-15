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
