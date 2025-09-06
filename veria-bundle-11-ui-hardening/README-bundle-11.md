# Veria — Bundle 11 (UI fingerprints + Hardening + Contract test)

**Adds**
- **Frontend**
  - `/admin/policies`: improved table (fingerprint copy button), selection feeds simulate.
  - `/products`: simulate panel can choose a specific policy, shows fingerprint.
- **Hardening (all services)**
  - zod-based config validation (env parsing).
  - Request-ID propagation (`x-request-id`) added at gateway and logged at services.
  - CORS tightening on gateway via `CORS_ORIGINS` (comma-separated list).
- **Gateway**
  - Refactored to `buildServer()` for testability.
  - **Contract test**: verifies proxying of `/policies` to downstream policy-service stub.

**Verify**
```bash
pnpm i
pnpm run dev:all
# or: docker compose -f infra/docker-compose.dev.yml up

# Run gateway contract test
pnpm --filter @veria/gateway test
```
