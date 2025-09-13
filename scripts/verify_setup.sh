# scripts/verify_setup.sh
#!/usr/bin/env bash
set -euo pipefail

echo "Verifying Veria baseline..."
REQS=("docs/PRODUCT_REQUIREMENTS.md" "prompts/claude_orchestration_veria.md" "bundles/veria_blitzy_starter_bundle")
for p in "${REQS[@]}"; do
  if [ ! -e "$p" ]; then
    echo "Missing: $p"; exit 1
  fi
done

if [ -f package.json ]; then
  if ! jq . >/dev/null 2>&1 < package.json; then
    echo "package.json invalid JSON"; exit 1
  fi
  echo "package.json OK"
fi

echo "OK — next: pnpm install && pnpm run dev (or dev:all)."
