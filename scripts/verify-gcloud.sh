#!/usr/bin/env bash
set -euo pipefail
LOG=logs/verify-gcloud.log
mkdir -p logs
PROJECT="veria-dev"
REGION="us-central1"
REPO="veria"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found" | tee -a "$LOG"; exit 1
fi

# Auth + project
(gcloud auth list --filter=status:ACTIVE --format="value(account)" || true) | tee -a "$LOG"
gcloud config set project "$PROJECT" | tee -a "$LOG"

APIS=(run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com iam.googleapis.com logging.googleapis.com secretmanager.googleapis.com)
for api in "${APIS[@]}"; do
  echo "Ensuring API enabled: $api" | tee -a "$LOG"
  gcloud services enable "$api" --project "$PROJECT" | tee -a "$LOG"
done

# Ensure Artifact Registry repo exists
if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  echo "Creating Artifact Registry repo $REPO in $REGION" | tee -a "$LOG"
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Veria containers" | tee -a "$LOG"
else
  echo "Artifact Registry repo exists: $REPO ($REGION)" | tee -a "$LOG"
fi

echo "gcloud verification complete." | tee -a "$LOG"