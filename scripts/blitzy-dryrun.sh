#!/usr/bin/env zsh
set -euo pipefail

echo "=== Blitzy Dry Run (dev) ==="
echo "Would build & push: us-central1-docker.pkg.dev/${TF_VAR_GCP_PROJECT}/veria-containers/veria-web:{GIT_SHA,latest}"
echo "Would set TF vars: enable_cloud_run=true, cr_service_name=veria-web, cr_image=...:latest, cr_env={'ENV':'dev'}"
echo "Would run: terraform init/plan/apply in infra/terraform/envs/dev"
echo "Use actual Blitzy or run manually with Makefile targets."
