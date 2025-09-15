#!/usr/bin/env bash
set -euo pipefail
: "${HEALTH_URL:?Set HEALTH_URL env var or repo secret}"
echo "Smoke: GET $HEALTH_URL"
code=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
if [ "$code" != "200" ]; then
  echo "Smoke failed: expected 200, got $code"
  exit 1
fi
echo "Smoke passed."
