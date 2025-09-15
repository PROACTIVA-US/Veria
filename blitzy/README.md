# Blitzy + Veria Infra

Use PR titles:
- **"Blitzy: Prepare Dev Infra"** – baseline plan/apply without Cloud Run.
- **"Blitzy: Deploy Veria Web (dev)"** – build/push image and set TF vars for Cloud Run.

Secrets required (GitHub Actions → repo secrets):
- `GCP_SA_KEY`, `TF_VAR_GCP_PROJECT`, `CF_API_TOKEN`, `CF_ZONE`, `ROOT_DOMAIN`

App image is built from the **app repo**, not here.
