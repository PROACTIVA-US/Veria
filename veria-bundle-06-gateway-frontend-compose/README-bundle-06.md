# Veria — Bundle 06 (Gateway Router + Frontend Wiring + Dev Compose)

Adds
- Gateway proxies to identity/policy/compliance.
- Frontend pages call gateway (onboarding & products wired).
- Dev Docker Compose runs all node services from your repo (no Dockerfiles).

## Verify
```bash
pnpm i
pnpm run dev:all
# or: docker compose -f infra/docker-compose.dev.yml up
```
Open:
- Frontend → http://localhost:3000
- Gateway → http://localhost:3001/health
- Identity → http://localhost:3002/health
- Policy → http://localhost:3003/health
- Compliance → http://localhost:3004/health
- Audit Writer → http://localhost:3005/health
