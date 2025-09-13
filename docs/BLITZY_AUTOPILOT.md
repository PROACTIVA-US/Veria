# BLITZY_AUTOPILOT

This file lets Blitzy run **end‑to‑end** with minimal intervention. It processes **all sprints** in `/docs/roadmap.md` sequentially and updates `/docs/checklist.md` and `/docs/autopilot_state.json` as it goes.

## Operating Principles
- **Single run, multiple sprints**: Read `PRD.md` → `/docs/prds/*` → `/docs/roadmap.md` → `/docs/checklist.md` → `/docs/autopilot_state.json`. Continue from the last state until everything is complete.
- **Stateful**: Persist progress to `/docs/autopilot_state.json` (see schema below). Never lose your place.
- **Verify & Commit after every task**: After each task, update the checklist, run verifiers, commit with a clear message, and push.
- **Budget/timeboxing**: If a task exceeds the budget/timebox below, record a **Blocker** in the checklist and continue with parallelizable items. Do not get stuck.

## Required Files
- `BLITZY_SETUP.md` (root)
- `PRD.md` (root)
- `/docs/prds/*.md`
- `/docs/roadmap.md`
- `/docs/checklist.md`
- `/docs/autopilot_state.json` (created if missing)
- `/scripts/verify-structure.sh`
- `/scripts/verify-and-commit.sh`

## Autopilot State Schema (`/docs/autopilot_state.json`)
```json
{
  "current_sprint": 1,
  "current_item": "",
  "completed_items": [],
  "blockers": [],
  "last_run_iso": "2025-09-13T00:00:00Z",
  "done": false
}
```

## Loop (Blitzy MUST follow)
1. **Load** state. If file missing, create with `current_sprint=1`, `done=false`.
2. **Read**: PRD.md → PRDs → roadmap.md → checklist.md.
3. **Select next work item**:
   - Use `/docs/roadmap.md` for sprint ordering.
   - Use `/docs/checklist.md` for remaining unchecked items in the current sprint.
4. **Implement** the item per its PRD.
5. **Update** `/docs/checklist.md` (`- [ ]` → `- [x]`) and append notes under **Blockers/Notes** if needed.
6. **Run verifiers**:
   ```bash
   ./scripts/verify-structure.sh
   ```
7. **Commit**:
   - Code/doc changes
   - Checklist update with message: `docs(checklist): mark <ITEM NAME> as complete`
   - Update `/docs/autopilot_state.json`
   - Push
8. If all items in sprint are checked, **increment** `current_sprint` and continue.
9. If all roadmap sprints are complete, set `"done": true` and add a final note in checklist.

## Commit Messages
- Code: `feat(<area>): <change>` or `chore(<area>): <change>`
- Checklist ticks: `docs(checklist): mark <ITEM NAME> as complete`
- State updates: include in the same commit as the checklist or code change.

## Failure Policy
- On test/verify failure: fix quickly; if blocked > timebox, record blocker in `autopilot_state.json` and **/docs/checklist.md** under **Blockers/Notes**, then proceed to the next safe item.
- Never erase prior work. Prefer additive commits and small PRs.

## Timebox / Budget (edit as needed)
- **Per item timebox:** 90 minutes
- **Per sprint timebox:** 2 working days
- **Max parallel items:** 2 (if independent)

## Definition of Done (Autopilot)
- All sprints in `/docs/roadmap.md` are complete with checkmarks.
- Verifier passes.
- `autopilot_state.json` has `"done": true`.
