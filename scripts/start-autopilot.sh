#!/usr/bin/env bash
set -euo pipefail
echo "=== Veria Blitzy Autopilot Kickoff ==="
echo "Ensure BLITZY_SETUP.md, docs/prds, roadmap.md, checklist.md exist."
echo "State file: docs/autopilot_state.json (will be created if missing)."
echo
echo "Next steps:"
echo "1) Open Claude."
echo "2) Paste the contents of docs/autopilot_prompt.md as your message."
echo "3) Let Blitzy run. It will process all sprints, update the checklist/state, verify, and commit."
