# Veria — Agent‑Era Trust & Policy Bundle (Drop‑In for Blitzy)

**Generated:** 2025-09-17 00:25:02 

This bundle adds *agent‑era primitives* to Veria while preserving your existing posture:
- **Low‑permeability, intentionally designed sandbox**
- **OIDC/WIF only**, **private‑only** services, **deploy by digest**

It contains:
- A new **Agent Trust Layer (ATL)** PRD
- Addenda to **API Gateway & Middleware** and **Compliance Dashboard** PRDs
- A **Tech‑Spec Addendum** (acceptance criteria, runbook)
- A **Policy Engine scaffold** (`policy/` schemas + examples + regression tests)
- **Code stubs** for `ai-broker` (policy middleware, provenance logging, rate‑limit hooks)
- A **Blitzy acceptance checklist** that bakes policy tests into CI

---

## Strategic Context (from “Virtual Agent Economies” → Veria)

Veria is *not* an open agent marketplace. It is regulated middleware for tokenized RWAs with a CPA/SMB wedge. The paper’s core insight is that **spontaneous, permeable agent economies** create systemic risk; the antidote is an **intentional, low‑permeability sandbox with identity, policy, and oversight**. Veria already has the right bones. This bundle adds the missing agent‑era layers:

1. **Agent Trust Layer (ATL)** — credentials/attestation for users, orgs, and automated agents, plus **provenance headers** on every ingress/egress.
2. **Policy Engine** — explicit enforcement for jurisdiction, AML/KYC flags, quotas/rate‑limits, and field‑level **data minimization/redaction**.
3. **Forensic Observability** — structured audit trail (request → policy decision → downstream effect), **Agent Activity** and **Policy Decisions** panels, and **Freeze/Unfreeze** operations.
4. **Controlled Interop** — **signed plugin manifests** and **capability‑scoped tokens** for connectors (QuickBooks/Xero, custodians, analytics).
5. **RWA Rulepacks** — domain‑specific checks for Treasuries/MMFs; **provenance‑bound** tax/report outputs.

**Why this fits Veria:** It doubles down on your private‑only, OIDC/WIF discipline and turns it into a market advantage: *compliance‑grade trust, policy, and auditability for AI‑enabled finance.*

---

## How to use this bundle (quick start)

1. **Commit the PRDs & addenda** under `docs/` in your Veria repo.
2. Drop the **`policy/` directory** into the repo root (or under `services/ai-broker/policy/`), and wire the provided CI commands.
3. Add the **code stubs** to `services/ai-broker/` and register the middleware.
4. Ensure Blitzy runs the **acceptance checklist**; failures block deploys.
5. Roll out in three sprints (90 days total) as described in `docs/roadmap_addendum.md`.

---

## Contents

- `docs/prds/agent_trust_layer_prd.md`
- `docs/prds/api_gateway_prd.addendum.md`
- `docs/prds/compliance_dashboard_prd.addendum.md`
- `docs/tech-spec-addendum.md`
- `docs/roadmap_addendum.md`
- `docs/blitzy-acceptance-checklist.md`
- `policy/` (schemas, examples, tests, CLI)
- `services/ai-broker/src/middleware/policyEngine.ts`
- `services/ai-broker/src/middleware/provenance.ts`
- `services/ai-broker/src/types/policy.ts`
- `services/ai-broker/src/types/provenance.ts`
- `services/ai-broker/src/plugins/manifest.schema.json`
- `services/ai-broker/src/plugins/example.manifest.json`
- `services/ai-broker/src/index.patch.md` (how to register middleware)
