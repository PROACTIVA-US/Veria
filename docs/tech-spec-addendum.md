# Tech‑Spec Addendum — Trust, Policy, and Audit

## Acceptance Criteria (augment existing)
- Every request logs a **Provenance** record and returns `X-Veria-Provenance`.
- **Policy simulation suite** passes (allow/deny, quotas, redaction).
- **Deny-list drill** succeeds: freeze blocks within 1s; unfreeze dual‑control.
- Blitzy deploy report includes: active policy ruleset hash, quotas, deny-list size.

## Runbook Extensions
- **Emergency Freeze**
  1) `veria policy freeze --org <ORG>`
  2) Confirm dashboard shows `FROZEN`; smoke test 401/403 on endpoints.
- **Forensic Replay**
  - `veria policy replay --req <REQ_ID> --dry-run` outputs decision trace.

## Logging Schema (JSON)
- `gateway.request`, `policy.decision`, `gateway.egress`, `atl.freeze`, `atl.unfreeze`.
