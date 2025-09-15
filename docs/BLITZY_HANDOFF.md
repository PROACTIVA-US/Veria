# Blitzy Handoff (Veria)

## Repo
- URL: https://github.com/PROACTIVA-US/Veria
- Default branch: main
- Baseline tag: v0.1.0 (create if missing: `make tag-baseline`)

## Entry Docs
- Primary: /BLITZY_SETUP.md
- Supplemental: /docs/BLITZY_HANDOFF.md (this file), /.env.example

## Required Secrets (GitHub → Settings → Secrets and variables → Actions)
- CLOUDFLARE_API_TOKEN
- CF_ACCOUNT_ID
- CF_ZONE_ID
- GCP_SA_KEY (JSON)
- VERIA_ENV (e.g., dev)
- HEALTH_URL (e.g., https://<dev-domain>/healthz)

## CI / Smoke
- CI workflow: .github/workflows/ci.yml
- Smoke: scripts/blitzy-smoke.sh (expects 200 from $HEALTH_URL)

## Deliverables
- Live URL
- Build logs link
- Artifact SHA/Tag
- Smoke test result (HTTP 200)

## Notes
- Do not rotate tag v0.1.0; create a new tag for further baselines.
