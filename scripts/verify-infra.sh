#!/usr/bin/env bash
set -euo pipefail
LOG=logs/verify-infra.log
mkdir -p logs

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform not found" | tee -a "$LOG"; exit 1
fi

# Format check (non-mutating)
terraform -chdir=infra/dev fmt -check | tee -a "$LOG" || true

# Init & validate
terraform -chdir=infra/dev init -upgrade -input=false | tee -a "$LOG"
set +e
terraform -chdir=infra/dev validate | tee -a "$LOG"
rc=$?
set -e

# Optional: tflint if present
if command -v tflint >/dev/null 2>&1; then
  (cd infra/dev && tflint --init && tflint) | tee -a "$LOG" || true
else
  echo "tflint not installed; skipping." | tee -a "$LOG"
fi

exit $rc