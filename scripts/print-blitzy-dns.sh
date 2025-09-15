#!/usr/bin/env zsh
set -euo pipefail

ENV_DIR="infra/terraform/envs/dev"
if [ ! -d "$ENV_DIR" ]; then
  echo "Expected $ENV_DIR"
  exit 1
fi

URL=$(cd "$ENV_DIR" && terraform output -raw cloud_run_url 2>/dev/null || true)
if [ -z "$URL" ]; then
  echo "No cloud_run_url output found. Did you enable Cloud Run and apply?"
  exit 1
fi

echo "Cloud Run URL: $URL"
echo
echo "To map app.veria.us in Cloudflare:"
echo "1) Verify 'veria.us' in Cloud Run (Domain mappings → Verify domain)."
echo "2) Create Domain Mapping for app.veria.us → service (region us-central1)."
echo "3) Add the suggested CNAME/A/AAAA records in Cloudflare until status is Active."
