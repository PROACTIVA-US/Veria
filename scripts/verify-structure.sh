#!/usr/bin/env bash
set -euo pipefail

bk_dir=".backup/pristine-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$bk_dir" logs scripts infra/dev services/hello

# Ensure .gitignore has sane defaults
if [[ -f .gitignore ]]; then cp .gitignore "$bk_dir/.gitignore.bak"; fi
cat <<'IG' | while read -r line; do
  grep -qxF "$line" .gitignore 2>/dev/null || echo "$line" >> .gitignore
done
# --- standard ignores ---
node_modules
.venv
__pycache__
.terraform
.terraform*
terraform.tfstate*
.DS_Store
.idea
.vscode
.dist
build
dist
.pytest_cache
.ruff_cache
.env
.env.*
logs/*.log
IG

missing=()
for d in infra/dev services/hello scripts logs; do
  [[ -d "$d" ]] || missing+=("$d")
done

if (( ${#missing[@]} > 0 )); then
  echo "[verify-structure] Created missing dirs: ${missing[*]}"
fi

# Quick tree echo
printf "[verify-structure] key paths:\n" | tee -a logs/verify-structure.log
for p in infra/dev services/hello scripts logs; do
  echo " - $p" | tee -a logs/verify-structure.log
done