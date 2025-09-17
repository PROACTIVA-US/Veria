# Addendum — Compliance Dashboard PRD

## Panels
- **Agent Activity**: volume, subjects/orgs, error/deny rates, top endpoints.
- **Policy Decisions**: allow/deny over time, reasons, ruleset diffs.
- **Freeze/Unfreeze**: action panel with dual‑control workflow.
- **Data Egress Diff**: before/after redaction samples (PII fields masked).

## User Stories
- *As a CPA*, I can freeze an org’s access and see immediate effect.
- *As an auditor*, I can export all events for a `reqId` with decisions.
- *As a risk officer*, I can set quotas per org and monitor breaches.
