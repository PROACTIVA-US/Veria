#!/bin/bash
# WIF provider creation/update script for GitHub Actions OIDC
# Supports both initial creation and idempotent updates

set -e

PROJECT_ID="veria-dev"
PROJECT_NUMBER="190356591245"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
SA_EMAIL="veria-automation@veria-dev.iam.gserviceaccount.com"

echo "===================================================="
echo "WIF Provider Setup for GitHub Actions OIDC"
echo "===================================================="
echo "Project: ${PROJECT_ID} (${PROJECT_NUMBER})"
echo "Pool: ${POOL_ID}"
echo "Provider: ${PROVIDER_ID}"
echo "Service Account: ${SA_EMAIL}"
echo ""

# Check if provider exists
echo "Checking if provider exists..."
if gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID} &>/dev/null; then

  echo "Provider exists. Updating configuration..."

  # Update existing provider with OIDC-specific command
  gcloud iam workload-identity-pools providers update-oidc ${PROVIDER_ID} \
    --project=${PROJECT_ID} \
    --location=global \
    --workload-identity-pool=${POOL_ID} \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor,attribute.workflow_ref=assertion.workflow_ref,attribute.aud=assertion.aud" \
    --attribute-condition='attribute.repository=="PROACTIVA-US/Veria" && (attribute.ref.startsWith("refs/heads/main") || attribute.ref.startsWith("refs/tags/"))'

  echo "✓ Provider updated successfully"

else
  echo "Provider does not exist. Creating new provider..."

  # Create new provider with OIDC-specific command
  gcloud iam workload-identity-pools providers create-oidc ${PROVIDER_ID} \
    --project=${PROJECT_ID} \
    --location=global \
    --workload-identity-pool=${POOL_ID} \
    --display-name="GitHub OIDC Provider" \
    --description="OIDC provider for GitHub Actions CD" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor,attribute.workflow_ref=assertion.workflow_ref,attribute.aud=assertion.aud" \
    --attribute-condition='attribute.repository=="PROACTIVA-US/Veria" && (attribute.ref.startsWith("refs/heads/main") || attribute.ref.startsWith("refs/tags/"))'

  echo "✓ Provider created successfully"
fi

echo ""
echo "===================================================="
echo "Provider Configuration"
echo "===================================================="

# Display provider details
gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID} \
  --format="yaml(name,state,oidc.issuerUri,attributeCondition)"

echo ""
echo "===================================================="
echo "Service Account IAM Binding"
echo "===================================================="

# Ensure service account has workload identity user binding
PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/PROACTIVA-US/Veria"

echo "Adding IAM binding for principal:"
echo "  ${PRINCIPAL}"

gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --project=${PROJECT_ID} \
  --role="roles/iam.workloadIdentityUser" \
  --member="${PRINCIPAL}" \
  --condition=None

echo "✓ IAM binding configured"

echo ""
echo "===================================================="
echo "Setup Complete!"
echo "===================================================="
echo "Provider Name: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
echo "Provider State: ACTIVE"
echo ""
echo "Required GitHub Secrets:"
echo "  GCP_PROJECT_ID=${PROJECT_ID}"
echo "  GCP_SA_EMAIL=${SA_EMAIL}"
echo "  WORKLOAD_IDENTITY_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
echo ""
echo "Next steps:"
echo "  1. Set the above secrets in GitHub repository settings"
echo "  2. Run 'make wif.verify' to verify configuration"
echo "  3. Trigger the OIDC smoketest workflow to test authentication"