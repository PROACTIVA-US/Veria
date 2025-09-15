#!/bin/bash
# WIF configuration verification script
# Validates that WIF provider and service account bindings are correctly configured

set -e

PROJECT_ID="veria-dev"
PROJECT_NUMBER="190356591245"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
SA_EMAIL="veria-automation@veria-dev.iam.gserviceaccount.com"

echo "===================================================="
echo "WIF Configuration Verification"
echo "===================================================="
echo ""

# Project details
echo "Project Configuration:"
echo "  ID: ${PROJECT_ID}"
echo "  Number: ${PROJECT_NUMBER}"
echo ""

# Pool details
echo "Workload Identity Pool:"
echo "  Name: ${POOL_ID}"
echo "  Location: global"

# Check if pool exists
if gcloud iam workload-identity-pools describe ${POOL_ID} \
  --project=${PROJECT_ID} \
  --location=global &>/dev/null; then
  echo "  Status: ✓ EXISTS"
else
  echo "  Status: ✗ NOT FOUND"
  exit 1
fi
echo ""

# Provider details
echo "Provider Configuration:"
echo "  Name: ${PROVIDER_ID}"

# Get provider details
if gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID} &>/dev/null; then

  echo "  Status: ✓ EXISTS"
  echo ""
  echo "Provider Details:"

  # Get provider state
  STATE=$(gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
    --project=${PROJECT_ID} \
    --location=global \
    --workload-identity-pool=${POOL_ID} \
    --format="value(state)")
  echo "  State: ${STATE}"

  # Get issuer URI
  ISSUER=$(gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
    --project=${PROJECT_ID} \
    --location=global \
    --workload-identity-pool=${POOL_ID} \
    --format="value(oidc.issuerUri)")
  echo "  Issuer URI: ${ISSUER}"

  # Get attribute condition
  CONDITION=$(gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
    --project=${PROJECT_ID} \
    --location=global \
    --workload-identity-pool=${POOL_ID} \
    --format="value(attributeCondition)")
  echo "  Attribute Condition:"
  echo "    ${CONDITION}"

else
  echo "  Status: ✗ NOT FOUND"
  echo "  Run './create-wif-provider.sh' to create the provider"
  exit 1
fi

echo ""
echo "===================================================="
echo "Service Account IAM Policy"
echo "===================================================="
echo "Service Account: ${SA_EMAIL}"
echo ""

# Get IAM policy for service account
echo "IAM Bindings:"
gcloud iam service-accounts get-iam-policy ${SA_EMAIL} \
  --project=${PROJECT_ID} \
  --format="json" | jq -r '.bindings[] | select(.role == "roles/iam.workloadIdentityUser") | .members[]' | while read member; do
  echo "  - ${member}"
done

echo ""
echo "Checking for required binding..."
EXPECTED_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/PROACTIVA-US/Veria"

if gcloud iam service-accounts get-iam-policy ${SA_EMAIL} \
  --project=${PROJECT_ID} \
  --format="json" | jq -e --arg principal "${EXPECTED_PRINCIPAL}" '.bindings[] | select(.role == "roles/iam.workloadIdentityUser") | .members[] | select(. == $principal)' &>/dev/null; then
  echo "✓ Required binding found:"
  echo "  Role: roles/iam.workloadIdentityUser"
  echo "  Member: ${EXPECTED_PRINCIPAL}"
else
  echo "✗ Required binding NOT found!"
  echo "  Expected: ${EXPECTED_PRINCIPAL}"
  echo "  Run './create-wif-provider.sh' to configure the binding"
  exit 1
fi

echo ""
echo "===================================================="
echo "Required Service Account Roles"
echo "===================================================="
echo "Checking project-level IAM roles for ${SA_EMAIL}..."

# Check for required roles
REQUIRED_ROLES=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/artifactregistry.writer"
)

for role in "${REQUIRED_ROLES[@]}"; do
  if gcloud projects get-iam-policy ${PROJECT_ID} \
    --format="json" | jq -e --arg role "$role" --arg member "serviceAccount:${SA_EMAIL}" '.bindings[] | select(.role == $role) | .members[] | select(. == $member)' &>/dev/null; then
    echo "✓ ${role}"
  else
    echo "✗ ${role} - NOT GRANTED"
    echo "  Run: gcloud projects add-iam-policy-binding ${PROJECT_ID} --member=\"serviceAccount:${SA_EMAIL}\" --role=\"${role}\""
  fi
done

echo ""
echo "===================================================="
echo "GitHub Secrets Configuration"
echo "===================================================="
echo "Set these secrets in your GitHub repository:"
echo ""
echo "GCP_PROJECT_ID=${PROJECT_ID}"
echo "GCP_SA_EMAIL=${SA_EMAIL}"
echo "WORKLOAD_IDENTITY_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
echo ""
echo "===================================================="
echo "Verification Complete!"
echo "===================================================="