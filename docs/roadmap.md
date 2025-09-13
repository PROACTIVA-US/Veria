# Veria Development Roadmap

This document ties the PRDs into an actionable build plan.  
It provides a phased approach that Blitzy and the team can execute immediately.

---

## Phase 1: Foundation (0–3 months)
**Objective:** Build adoption wedge through accountants and CPAs.  

- **QuickBooks/Xero Connector**  
  - Implement OAuth login + account sync.  
  - Map tokenized assets into Chart of Accounts.  
  - Generate reconciliation reports.  
- **Compliance Dashboard (MVP)**  
  - Scaffold dashboard UI (React/Next.js).  
  - Display tokenized balances and compliance status.  
  - Add basic export (CSV/PDF).  

✅ Deliverables:  
- `/connectors/quickbooks` MVP  
- `/dashboard` scaffold  

---

## Phase 2: Automation (3–6 months)
**Objective:** Provide tangible automation value for CPAs and SMBs.  

- **Tax Reporting Engine**  
  - Track realized/unrealized gains.  
  - Classify short vs long-term.  
  - Generate IRS-ready 8949 + 1099 forms.  
- **Compliance Dashboard (v2)**  
  - Add role-based access (CPA, SMB, Auditor).  
  - Improve real-time valuation updates (oracle feeds).  

✅ Deliverables:  
- `/tax-engine`  
- `/dashboard` v2  

---

## Phase 3: Platform Hardening (6–9 months)
**Objective:** Position Veria as API-first middleware.  

- **API Gateway & Middleware**  
  - Authentication + role-based access.  
  - Multi-tenant SaaS support.  
  - Rate limiting + audit logging.  
- **Compliance Engine (core rules)**  
  - JSON-configurable rules for jurisdictional compliance.  
  - Integration with dashboard + tax engine.  

✅ Deliverables:  
- `/api-gateway`  
- `/compliance-engine` (stub for rules engine)  

---

## Phase 4: Expansion (9–12 months)
**Objective:** Expand feature set and begin external partnerships.  

- Treasury pack (tokenized T-bills, MMFs).  
- NetSuite connector (enterprise readiness).  
- Regulator-facing dashboard mode.  

---

# Sprint Breakdown
- **Sprint 1** (Weeks 1–3): QuickBooks Connector MVP + Dashboard scaffold.  
- **Sprint 2** (Weeks 4–6): Tax Engine core + Report Exports.  
- **Sprint 3** (Weeks 7–9): API Gateway base + Multi-tenant roles.  

---

# Success Criteria
- Tokenized assets appear in QuickBooks/Xero with zero manual reconciliation.  
- Compliance dashboard exports an audit-ready report.  
- Tax Engine generates correct IRS forms verified against CPA test cases.  
- API Gateway supports at least 3 orgs in multi-tenant mode.  

---

# Notes
- Keep PRDs in `/docs/prds/` updated as modules evolve.  
- Roadmap is living — adjust sprint timelines based on progress.  
- Consider spinning off a `veria-docs` repo once adoption grows.
