# Veria Infrastructure (Cloud Run + Blitzy Ready)

This is an enhanced version of the Veria infra baseline that adds **optional Cloud Run** deployment plumbing
and a **Blitzy manifest** so Blitzy can build/push an image and hand variables to Terraform automatically.

- Keep **enable_cloud_run=false** until you're ready to deploy the first service.
- VISLZR can be layered later; this focuses on `veria.us`.

See `infra/DEPLOY.md` and `infra/DEPLOY_CLOUDRUN.md`.
