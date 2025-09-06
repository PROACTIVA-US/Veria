# Veria — Bundle 09 (Policy persistence + Fingerprint propagation + Admin UI)

**Adds**
- `@veria/policy-service` now persists policies using **SQLite + Prisma**.
- Fingerprint is carried into **compliance evidence** if provided.
- Frontend **/admin/policies** to list policies (id, name, version, fingerprint) and show a basic JSON diff.

**Verify**
```bash
pnpm i
# one-time generate prisma client
pnpm --filter @veria/policy-service prisma:generate

# start services (choose your method)
pnpm run dev:all
# or: pnpm --filter @veria/policy-service dev
#     pnpm --filter @veria/gateway dev
#     pnpm --filter @veria/frontend dev
```

Create a policy (UI or curl) then visit **/admin/policies** to view and diff.

**Notes**
- SQLite DB lives at `services/policy-service/prisma/dev.db` by default.
- To reset DB quickly: delete that file and re-run `prisma:generate` (no migrations yet).
