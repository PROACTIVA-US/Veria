#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Verifying Veria repo structure..."

# -------- Root docs (required) --------
for f in PRD.md BLITZY_SETUP.md; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing $f"
    exit 1
  fi
done

# -------- Core docs (required) --------
for f in docs/roadmap.md docs/checklist.md; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing $f"
    exit 1
  fi
done

# -------- Module PRDs (required) --------
for f in quickbooks_connector_prd.md compliance_dashboard_prd.md tax_reporting_prd.md api_gateway_prd.md; do
  if [[ ! -f "docs/prds/$f" ]]; then
    echo "❌ Missing docs/prds/$f"
    exit 1
  fi
done

# -------- Module directories (required) --------
for d in connectors/quickbooks dashboard tax-engine api-gateway; do
  if [[ ! -d "$d" ]]; then
    echo "❌ Missing $d/"
    exit 1
  fi
done

# Dashboard should look like a Next.js scaffold
if [[ ! -f "dashboard/package.json" ]]; then
  echo "❌ Missing dashboard/package.json (expected Next.js scaffold)"
  exit 1
fi

echo "✅ Core repo structure verified"

# -------- Autopilot files (recommended → fail if you want strict mode) --------
missing_autopilot=0
for f in docs/BLITZY_AUTOPILOT.md docs/autopilot_state.json docs/autopilot_prompt.md; do
  if [[ ! -f "$f" ]]; then
    echo "⚠️  Autopilot file missing: $f"
    missing_autopilot=1
  fi
done

if [[ $missing_autopilot -eq 0 ]]; then
  echo "✅ Autopilot files present"
else
  echo "ℹ️  Autopilot files are recommended. Add them to enable full multi-sprint automation."
fi

# -------- Optional: soft check for Sprint 1 items ticked in checklist --------
# (Warn only; don’t fail CI. Switch WARN_ONLY=0 to enforce.)
WARN_ONLY=1
declare -a SHOULD_BE_CHECKED=(
  "- [x] QuickBooks Connector MVP"
  "- [x] Compliance Dashboard Scaffold"
)

not_checked=0
for line in "${SHOULD_BE_CHECKED[@]}"; do
  if ! grep -qF "$line" docs/checklist.md; then
    echo "⚠️  Checklist not marked complete for: $line"
    not_checked=1
  fi
done

if [[ $not_checked -eq 1 ]]; then
  if [[ $WARN_ONLY -eq 1 ]]; then
    echo "ℹ️  Checklist items not fully checked. Proceeding (soft warning)."
  else
    echo "❌ Checklist enforcement enabled and items are not checked. Failing."
    exit 1
  fi
else
  echo "✅ Checklist shows Sprint 1 completion (or equivalent)"
fi

echo "🎉 Verification complete — repo is ready"
