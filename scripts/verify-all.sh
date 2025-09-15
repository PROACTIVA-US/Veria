#!/usr/bin/env bash
set -euo pipefail

fail=0
./scripts/verify-structure.sh || fail=1
./scripts/verify-infra.sh || fail=1
./scripts/verify-gcloud.sh || fail=1
./scripts/verify-build.sh || fail=1

if [[ $fail -eq 0 ]]; then
  echo "ALL CHECKS PASSED"
else
  echo "ONE OR MORE CHECKS FAILED (see logs/*)"
fi
exit $fail