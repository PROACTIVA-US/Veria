# Deploying Veria Infra

Follow the baseline steps to set secrets, state bucket, etc. (same as the prior bundle).

## New: Cloud Run Option
- Toggle via `TF_VAR_enable_cloud_run=true` and set `TF_VAR_cr_image` to your pushed image.
- See `infra/DEPLOY_CLOUDRUN.md` to bind `app.veria.us` to Cloud Run with HTTPS.
