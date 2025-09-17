# Addendum — API Gateway & Middleware PRD

## New: Policy Engine (PE)
- Enforce **jurisdiction**, **AML/KYC flags**, **rate-limits/quotas**, **data minimization/redaction**.
- Produce **policy decision record**: `{reqId, subject, rulesetVersion, inputs, decision, reasons, obligations}`.
- Deny-list enforcement and **kill-switch** support.

## New: Plugin Contracts
- **Signed manifest** required (see `services/ai-broker/src/plugins/manifest.schema.json`).
- **Capability tokens**: short‑lived, scope‑limited JWTs issued to plugins.
- Field‑level redaction map applied pre‑egress.

## Observability
- Emit structured logs: `gateway.request`, `policy.decision`, `gateway.egress`.
- Provide metrics: policy deny count, freeze status, redaction hits.
