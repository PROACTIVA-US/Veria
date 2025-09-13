# Claude Orchestration — Veria (Blitzy-ready, no Vislzr)

You are working **only** in this repository (Veria). Do **not** reference Vislzr.

## Authoritative Paths
- Starter bundle (unzipped): `./bundles/veria_blitzy_starter_bundle/`
- PRD to overwrite (single source of truth): `./docs/PRODUCT_REQUIREMENTS.md`
- Prompts folder: `./prompts/`
- Apps: `./apps/` (e.g., `./apps/frontend/` if present)
- Services: `./services/` (gateway, identity-service, policy-service, compliance-service, audit-log-writer)
- Shared packages: `./packages/`
- Infra & scripts: `./infra/`, `./scripts/`

If a path is missing, create it.

## Objectives
1) **Update PRD**
   - Overwrite `./docs/PRODUCT_REQUIREMENTS.md` with the latest Veria spec.
   - Remove all Vislzr mentions; define the **Standard UI** plan as the default frontend (admin dashboard + basic flows).
   - Include clear functional requirements, minimal data model sketch, and integration points for Blitzy automation.

2) **Integrate Starter Bundle**
   - From `./bundles/veria_blitzy_starter_bundle/`, copy files into correct locations without clobbering unrelated modules.
   - On conflict, create `*_MERGE_NOTES.md` alongside the file with (a) proposed patch/diff, (b) why the conflict happened, (c) the recommended resolution.

3) **Project Scripts & NPM**
   - Ensure `package.json` (monorepo root) exposes scripts: `dev`, `build`, `lint`, `test`, and optional `dev:all` if supported.
   - If the bundle provides scripts, merge them safely and update `README.md` with the runnable commands.

4) **Housekeeping**
   - Remove or rewrite any file that implies Vislzr supplies Veria’s frontend.
   - Keep all orchestration prompts under `./prompts/` and link them from `README.md`.

## Deliverables
- Updated `./docs/PRODUCT_REQUIREMENTS.md`
- Updated `README.md` (top section: one-paragraph product summary; quickstart; where prompts live; where PRD and bundle live)
- If applicable: `./scripts/verify_setup.sh` to sanity-check env, lint/build, and next steps
- Any `*_MERGE_NOTES.md` files when human review is required

## Guardrails
- Only modify files inside this repo.
- When unsure, prefer additive changes and produce `*_MERGE_NOTES.md` with exact diffs.
