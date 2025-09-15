#!/bin/bash
# Emergency script to create WIF provider using gcloud CLI
# Use this if Terraform can't be applied

set -e

PROJECT_ID="veria-dev"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"

echo "Creating WIF provider for GitHub Actions..."

# Create the provider
gcloud iam workload-identity-pools providers create ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID} \
  --display-name="GitHub OIDC Provider" \
  --description="OIDC provider for GitHub Actions" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.workflow_ref=assertion.workflow_ref,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
  --attribute-condition=""

echo "Provider created successfully!"

# Show the provider details
gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID}

echo ""
echo "WIF Provider path:"
echo "projects/190356591245/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"