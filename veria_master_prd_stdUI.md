# VERIA — Compliance Middleware with Standard UI

**Version:** v1 (2025‑09‑11)\
**Owner:** Daniel Connolly (+ Core Contributors)\
**Purpose:** Define the end‑to‑end product for **Veria** (compliance + tokenization middleware for RWAs), and provide Blitzy‑consumable artifacts (PRD JSON + task graphs) to drive automated execution. All Vislzr/IDE elements are removed for this track. A standard UI frontend is prioritized for MVP.

---

## 1) Vision & North Star

Veria is a **compliance‑first middleware and user interface** for discovery, onboarding, and lifecycle management of tokenized real‑world assets (starting with Treasuries & MMFs). It ensures regulatory alignment, investor eligibility, custody integrity, and auditability. Later, it will be mappable to Vislzr as a graph/timeline interface, but MVP uses a **traditional web UI**.

**North Star Outcomes**

- A PM, compliance lead, or operations team can onboard assets (T‑Bills, MMFs), configure custodians and SPVs, enforce KYC/KYB/AML, register investors, and export evidence — all from a **standard UI wizard**.
- **Compliance is native**: every step attaches jurisdiction, asset type, risk, and control mappings. Exports include evidence packs and manifests.
- **Blitzy‑ready**: Veria can export a PRD JSON + Task Graph JSON for execution (infra, repos, tickets).

---

## 2) Goals & Success Metrics

**Primary Goals**

1. Ship a stable **Standard Web UI** with onboarding wizard, custody setup, SPV/legal entity creation, tokenization adapter, investor registry, and evidence pack export.
2. Ship **Compliance View** overlays with risk and jurisdiction filters.
3. Ship **Blitzy Export** to PRD/Task Graph JSON.
4. Ensure pluggable integrations (custodians, KYC/KYB providers, tokenization engines).

**Success Metrics (90 days)**

- First dry‑run mint < 14 days.
- Compliance evidence export < 30s.
- Blitzy import success ≥ 98% with no manual edits.
- ≥ 95% test pass rate on P0 flows.

---

## 3) Scope & Non‑Goals

**In‑Scope**

- Standard web UI (Next.js/React, Tailwind, Radix) with onboarding wizard.
- Custodian + SPV configuration.
- KYC/KYB/AML controls, evidence attachments.
- Investor registry and eligibility classes.
- Tokenization adapter (mint/burn/transfer restrictions).
- Compliance evidence export.
- Blitzy export (PRD + tasks).

**Non‑Goals (v1)**

- Graph/timeline IDE (Vislzr).
- Multi‑tenant org management (basic RBAC only).
- Heavy analytics (basic dashboards only).

---

## 4) Personas & Key Use Cases

**Personas**

- **Compliance Lead**: configures controls, reviews evidence.
- **Product/Operations**: drives onboarding workflows.
- **Legal Counsel**: ensures SPV/trust and jurisdictional coverage.
- **Integrator/Partner**: plugs Veria into custodians and tokenization engines.

**Flagship Use Cases**

1. **T‑Bills → RWA pipeline**: Issuer → Custodian → SPV → Tokenization → Investors.
2. **Accounting Firms (500 SMBs)**: standardize onboarding (client intake, doc collection, KYB, investor registry, evidence).
3. **Banks/Broker‑Dealers**: custody + SPV + transfer rules enforcement.
4. **Municipalities/Public Funds**: policy mapping, provider diligence, reporting, KYB, evidence packs.

---

## 5) System Overview

**Frontend**: Next.js + React + Tailwind + Radix UI.\
**Backend**: Node (NestJS/Express) or FastAPI; Postgres (JSONB) preferred.\
**Integrations**: Custodian API, KYC/KYB providers, Tokenization adapter, Evidence storage.\
**Auth**: JWT/OAuth2.\
**Telemetry**: OpenTelemetry → PostHog/ClickHouse.

---

## 6) Functional Requirements (FR)

**FR‑1 UI Shell & Navigation**

- Global nav: Dashboard, Onboarding Wizard, Investor Registry, Compliance, Settings.
- RBAC: Admin, Editor, Viewer.

**FR‑2 Onboarding Wizard**

- Steps: Asset Source → Custody → SPV/Trust → Tokenization → Investors → Evidence.
- Each step enforces controls and collects evidence.

**FR‑3 Investor Registry**

- Define investor classes (accredited, qualified).
- KYC/KYB integration with retry/status.
- Eligibility validation rules.

**FR‑4 Tokenization Adapter**

- Mint/Burn functions.
- Transfer restriction enforcement.
- Jurisdiction overlays.

**FR‑5 Compliance Evidence**

- Attachments (docs, URLs).
- Export ZIP with manifest + hashes.
- Missing evidence warnings.

**FR‑6 Blitzy Export**

- PRD JSON and Task Graph JSON.
- Must validate against schema.
- Import success ≥ 98%.

---

## 7) Data Model (abridged)

**Entity: Investor**

```json
{
  "id": "inv1",
  "name": "John Doe",
  "class": "accredited",
  "jurisdiction": "US",
  "kycStatus": "approved",
  "evidence": ["s3://bucket/id-verification.pdf"]
}
```

**Entity: Evidence Pack**

```json
{
  "id": "ep1",
  "projectId": "veria-core",
  "files": ["s3://bucket/kyb.pdf"],
  "manifest": {"hash": "abc123", "ts": "2025-09-11T12:00:00Z"}
}
```

---

## 8) API (REST)

- `POST /api/projects` → create project.
- `GET /api/projects/:id` → read.
- `PATCH /api/projects/:id` → update.
- `POST /api/evidence/export` → ZIP + manifest.
- `POST /api/export/blitzy/prd` → PRD JSON.
- `POST /api/export/blitzy/tasks` → Task Graph JSON.

---

## 9) Blitzy Export — Example PRD JSON

```json
{
  "meta": {"product": "Veria", "version": "1.0", "projectId": "veria-core"},
  "vision": "Compliance-first middleware and UI for RWAs.",
  "goals": ["Standard UI","Onboarding Wizard","Controls+Evidence","Blitzy hooks"],
  "kpis": ["Dry-run mint <14d","Evidence export <30s","Import >98%"],
  "personas": ["Compliance","Ops","Legal"],
  "scope": {"in": ["UI","Onboarding","Controls","Registry","Tokenization","Blitzy"], "out": ["Vislzr IDE"]},
  "architecture": {"frontend": "Next.js/React", "backend": "Node+Postgres"},
  "risks": ["Regulatory variance"],
  "mitigations": ["Pluggable dictionaries"],
  "attachments": []
}
```

---

## 10) Sprints (v1)

**Sprint 1**: UI Shell + Auth + Roles.\
**Sprint 2**: Onboarding Wizard (Asset, Custody).\
**Sprint 3**: SPV/Trust + Legal + Evidence.\
**Sprint 4**: Investor Registry + KYC/KYB.\
**Sprint 5**: Tokenization Adapter.\
**Sprint 6**: Blitzy Export + QA.

---

# End of PRD v1 (Veria‑only, Standard UI)

