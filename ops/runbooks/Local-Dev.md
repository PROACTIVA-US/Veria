# Local Dev Runbook

## Prereqs
- Node 20 (`nvm use`), pnpm (`corepack enable`)

## Start
- Gateway: `pnpm --filter @veria/gateway dev`
- Frontend: `pnpm --filter @veria/frontend dev`
- Identity: `pnpm --filter @veria/identity-service dev`
- Policy: `pnpm --filter @veria/policy-service dev`
- Compliance: `pnpm --filter @veria/compliance-service dev`
- Audit Writer: `pnpm --filter @veria/audit-log-writer dev`

## Quick Checks
- `/health` on each service
- Create + simulate policy; emit decision; inspect `.audit-data/audit.log`
