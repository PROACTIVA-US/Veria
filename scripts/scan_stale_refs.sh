# scripts/scan_stale_refs.sh
#!/usr/bin/env bash
set -euo pipefail

echo "Scanning for possible stale references..."
PATTERNS='Vislzr|veria_blitzy_starter_bundle|PRODUCT_REQUIREMENTS|claude_orchestration|frontend'
if command -v rg >/dev/null 2>&1; then
  rg -n --hidden --glob '!.git' -e "$PATTERNS" || true
else
  grep -RIn --exclude-dir=.git -E "$PATTERNS" . || true
fi

echo "Review hits above. For any Vislzr coupling in Veria, edit or remove."
