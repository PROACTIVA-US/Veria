# Veria — Bundle 07 (Evidence + Audit Viewer + UI + Unit Tests)

Adds:
- **Evidence Bundle v0.1** (docs/evidence.schema.json) and serializer in compliance-service.
- **Audit endpoints**: audit-writer now exposes `GET /audit/log` and `GET /audit/items`.
- **Gateway** proxies `/audit/health`, `/audit/items` to audit-writer.
- **Frontend**: `/admin/audit` viewer page to inspect recent audit events (with JSON trace modal).
- **Components**: `EligibilityBadge`, `DecisionTraceModal` in `@veria/components`.
- **Unit tests**: policy create/simulate; compliance decision emits evidence.

## Verify
```bash
pnpm i
# start stack (any prior method works)
pnpm run dev:all
# or: docker compose -f infra/docker-compose.dev.yml up

# In the frontend:
# - Visit /products and create a policy
# - (optional) Emit a decision via curl, then visit /admin/audit to see it
curl -X POST http://localhost:3001/decisions -H 'content-type: application/json' -d '{"jurisdiction":"US"}'
```

## Run unit tests
```bash
pnpm --filter @veria/policy-service test
pnpm --filter @veria/compliance-service test
```
