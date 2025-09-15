#!/usr/bin/env bash
set -euo pipefail
LOG=logs/verify-build.log
mkdir -p logs
PROJECT="veria-dev"
REGION="us-central1"
REPO="veria"
IMG="us-central1-docker.pkg.dev/${PROJECT}/${REPO}/veria-hello:verify-$(date +%Y%m%d-%H%M%S)"

if [[ -f services/hello/Dockerfile ]]; then
  echo "Submitting Cloud Build for services/hello -> $IMG" | tee -a "$LOG"
  gcloud builds submit --tag "$IMG" services/hello | tee -a "$LOG"
  echo "Built image: $IMG" | tee -a "$LOG"
else
  echo "services/hello/Dockerfile not found; skipping build." | tee -a "$LOG"
fi