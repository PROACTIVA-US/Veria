# @veria/gateway (Bundle 06)

Proxies to services:
- `GET /identity/health`, `POST /auth/passkey/register` → identity
- `GET/POST /policies`, `POST /policies/simulate` → policy
- `POST /decisions` → compliance

Env:
- `IDENTITY_URL` (default `http://localhost:3002`)
- `POLICY_URL` (default `http://localhost:3003`)
- `COMPLIANCE_URL` (default `http://localhost:3004`)
