#!/usr/bin/env bash
set -euo pipefail

# Optional override:
#   MESSAGE="chore(verify): structure verified and checklist synced" ./scripts/verify-and-commit.sh
MESSAGE="${MESSAGE:-chore(verify): structure verified}"

./scripts/verify-structure.sh
echo "✅ Structure check passed"

# Stage changes (if any)
git add -A

# If nothing to commit, exit gracefully
if git diff --cached --quiet; then
  echo "ℹ️  No staged changes to commit."
  exit 0
fi

git commit -m "$MESSAGE"
git push
echo "🚀 Changes committed & pushed"
