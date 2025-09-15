# Blitzy Deployment Notes (Veria)

**Goal:** Blitzy can: (1) build and push a Docker image to Artifact Registry, (2) set Terraform vars, (3) run plan/apply for `envs/dev`, (4) (optional) assist with custom domain mapping steps.

## What Blitzy Should Do
1. **Build + Push Image**
   - Context: the Veria app repo (not infra repo).
   - Tag: `us-central1-docker.pkg.dev/${TF_VAR_GCP_PROJECT}/veria-containers/veria-web:${GIT_SHA}`
   - Also push `:latest`.

2. **Set Terraform Variables for Cloud Run (dev)**
   - `TF_VAR_enable_cloud_run=true`
   - `TF_VAR_cr_service_name="veria-web"`
   - `TF_VAR_cr_image="us-central1-docker.pkg.dev/${TF_VAR_GCP_PROJECT}/veria-containers/veria-web:latest"`
   - (optional) `TF_VAR_cr_env = { "ENV" = "dev" }`

3. **Run Terraform Plan/Apply (dev)**
   - Working dir: `infra/terraform/envs/dev`
   - Plan, then apply on approval.

4. **Assist Custom Domain Mapping (optional)**
   - After apply, read the `cloud_run_url` output.
   - Follow `infra/DEPLOY_CLOUDRUN.md` to bind `app.veria.us` to Cloud Run.

> Blitzy: only act on PRs titled **"Blitzy: Prepare Dev Cloud Run"** or **"Blitzy: Deploy Veria Web (dev)"**.
