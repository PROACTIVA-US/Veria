#!/usr/bin/env bash
set -euo pipefail
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-veria-hello}"
URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
TOK="$(gcloud auth print-identity-token)"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOK" "$URL/_ah/health")
[ "$code" = "200" ] && echo "Smoke passed." || { echo "Smoke failed: $code"; exit 1; }
