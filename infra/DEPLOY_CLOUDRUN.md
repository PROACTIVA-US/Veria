# Cloud Run + Custom Domain (Cloudflare) Guide

This guide binds your Cloud Run service to `app.veria.us` behind Cloudflare.

## 1) Deploy Service
- Ensure Terraform variable `enable_cloud_run=true` and `cr_image` is set to a valid image in Artifact Registry.
- Apply Terraform in `infra/terraform/envs/dev`. Note the output `cloud_run_url` (e.g., `https://veria-web-xxxxx-uc.a.run.app`).

## 2) Verify Domain in Cloud Run
- In GCP Console → Cloud Run → Domain mappings → **Verify domain** for `veria.us` (once per project).
- This adds TXT records; add them in Cloudflare (or let Cloud Console do it if Cloudflare is connected). Wait for verification.

## 3) Create Domain Mapping
- Still in Cloud Run: Create a Domain Mapping for `app.veria.us` → your service (`veria-web`) in region `us-central1`.
- Cloud Run will instruct you to add **CNAME** and possibly **A/AAAA** to `ghs.googlehosted.com` or specific records.
- Add those DNS records in Cloudflare and wait for status to turn **Active**. Managed certificate will provision automatically.

## 4) Cloudflare settings
- Proxy (orange-cloud) can remain ON.
- SSL/TLS mode: **Full** (strict recommended if you upload origin certs; managed certs are fine).
- No page rules needed; optional caching as you prefer.

### Notes
- Domain mapping via Terraform is possible but brittle across providers/versions; the console flow is the most reliable.
- Once verified/mapped, this rarely needs rework.
