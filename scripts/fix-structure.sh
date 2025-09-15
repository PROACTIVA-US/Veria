#!/usr/bin/env zsh
set -euo pipefail
# Hoist nested bundle folders (e.g., veria-infra, veria-infra-cloudrun) to repo root.

NESTED_DIRS=(veria-infra veria-infra-cloudrun veria-verify-kit)
for d in "${NESTED_DIRS[@]}"; do
  if [ -d "$d/infra" ] || [ -d "$d/blitzy" ] || [ -d "$d/scripts" ] || [ -f "$d/BLITZY_SETUP.md" ]; then
    echo "Hoisting contents of $d to repo root..."
    rsync -a "$d/"/ ./
    rm -rf "$d"
  fi
done

echo "Done. Now run: scripts/verify-structure.sh"
