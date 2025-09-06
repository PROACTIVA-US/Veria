# Testing Strategy

## Taxonomy
- Unit → Component → Contract → Integration → E2E → Perf → Security → Compliance

## Global Requirements
- Unit ≥80% services, ≥70% frontend; Contract tests (Pact later), Playwright E2E, k6 perf, SAST/Trivy/OSV weekly

## Bundle Coverage Map
- B01: gateway smoke
- B02: frontend smoke (Playwright included in B04 harness)
- B03: identity/policy units + REST smoke
- B04: compliance/audit integration + Playwright smoke + k6 sample
