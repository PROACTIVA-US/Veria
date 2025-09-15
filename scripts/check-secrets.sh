#!/usr/bin/env zsh
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not installed. Install GitHub CLI to use this script."
  exit 1
fi

REQUIRED=(GCP_PROJECT_ID GCP_SA_EMAIL WORKLOAD_IDENTITY_PROVIDER TF_VAR_GCP_PROJECT CF_API_TOKEN CF_ZONE ROOT_DOMAIN)
echo "Checking repo secrets..."
for s in "${REQUIRED[@]}"; do
  if gh secret list | awk '{print $1}' | grep -qx "$s"; then
    echo "✔ $s"
  else
    echo "✖ Missing: $s"
  fi
done
