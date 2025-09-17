# PRD — Agent Trust Layer (ATL)

## Problem
CPAs/banks require provable identity, provenance, and revocation for both humans and automated agents integrating with Veria.

## Goals
- Establish verifiable **agent/org identity** (JWT with attestation; optional DID/VC).
- Emit **provenance headers** for every API ingress/egress.
- Maintain **reputation signals** and **deny-lists** (freeze/unfreeze).

## Non-Goals
- Public agent marketplace; anonymous access.

## Functional Requirements
1. **Credential Intake**
   - Accept OIDC JWTs with `sub` (subject), `org`, `scopes`, `attestations[*]` (hash → external record).
   - Optional DID/VC envelope (future‑compatible).
2. **Provenance**
   - Attach `X-Veria-Provenance` header: `{reqId, subject, org, policyHash, decision, timestamp}`.
   - Persist audit trail: request, policy inputs, policy decision, downstream effects.
3. **Reputation & Sanctions**
   - Maintain risk score per subject/org; expose in dashboard.
   - Deny-list + manual freeze; unfreeze requires dual control.
4. **Interoperability**
   - Signed **plugin manifests** for third-party connectors.
   - Issue **capability-scoped** tokens (least privilege).

## APIs
- `POST /atl/attestations:verify` → stores/verifies attestation references.
- `GET  /atl/subjects/:id/reputation` → risk score + rationale.
- Events: `atl.freeze`, `atl.unfreeze`, `atl.policy.decision` (to audit log).

## Acceptance Criteria
- All gateway calls include `X-Veria-Provenance`.
- Freeze prevents traffic within 1s; unfreeze requires dual control & logs.
- Audit entries are queryable by `reqId` and exportable for examiners.
