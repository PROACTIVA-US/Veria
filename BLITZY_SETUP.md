# BLITZY_SETUP

## Purpose
These are the instructions for Blitzy (build orchestrator) to initialize, scaffold, and iterate on Veria.

## Read order (required)
1. `PRD.md` (root) — master index and global Definition of Done
2. `/docs/prds/*.md` — all module PRDs
3. `/docs/roadmap.md` — sprint plan / phases (source of truth for sequence)
4. `/docs/checklist.md` — living progress tracker (create if missing)

## Required scaffold (root-level directories)
- `/connectors/quickbooks`
- `/dashboard`
- `/tax-engine`
- `/api-gateway`

Each must include:
- `README.md` summarizing the module and linking to its PRD
- A working scaffold that builds locally
- API route stubs matching the PRD

## Sprint 1 (implement now)
- **QuickBooks Connector MVP**
  - OAuth flow (stub ok; use mock keys)
  - Chart of Accounts mapping
  - Mock transaction import + reconciliation export (CSV/PDF)
- **Compliance Dashboard scaffold**
  - Next.js app + basic pages
  - Placeholders for portfolio, compliance status, export button

## Repo hygiene
- Remove/retire any duplicate/outdated docs, scripts, and local tools not referenced in `PRD.md` or `/docs/roadmap.md` (e.g., husky) **unless** required by generated scaffolds.
- Ensure naming is consistent across modules.

## Verification (CI-lite)
- For each module:
  - Add `npm run dev` (or equivalent) sanity check
  - Ensure type checks / linters pass
- Update `/docs/checklist.md` on completion of each subtask

## Outputs
- Updated repo with scaffolded modules matching PRDs
- Updated `/docs/checklist.md` with Sprint 1 progress
