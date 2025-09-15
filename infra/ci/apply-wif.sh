#!/bin/bash
# Script to apply WIF configuration for GitHub Actions
# Run this with GCP credentials that have project owner permissions

set -e

echo "===================================="
echo "Applying WIF Configuration"
echo "===================================="

# Authenticate to GCP
echo "Step 1: Authenticating to GCP..."
gcloud auth login
gcloud config set project veria-dev

# Enable required APIs first
echo "Step 2: Enabling required APIs..."
gcloud services enable iam.googleapis.com
gcloud services enable iamcredentials.googleapis.com
gcloud services enable sts.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Apply Terraform
echo "Step 3: Applying Terraform configuration..."
cd "$(dirname "$0")"
terraform init -upgrade
terraform plan -out=tfplan
terraform apply tfplan

# Output the values for GitHub secrets
echo "Step 4: Capturing outputs for GitHub secrets..."
WIF_PROVIDER=$(terraform output -raw workload_identity_provider)
SERVICE_ACCOUNT=$(terraform output -raw service_account_email)

echo ""
echo "===================================="
echo "Configuration Complete!"
echo "===================================="
echo ""
echo "GitHub Secrets to configure:"
echo "GCP_WIF_PROVIDER: $WIF_PROVIDER"
echo "GCP_WIF_SERVICE_ACCOUNT: $SERVICE_ACCOUNT"
echo ""
echo "These have already been set in the repository."