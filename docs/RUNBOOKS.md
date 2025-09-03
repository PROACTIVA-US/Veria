
# Runbooks

## Incident: Policy Deny Spike
1. Check `/healthz` and edge `GET /healthz`.
2. Inspect recent changes in policy packs.
3. Roll back feature flag or policy pack to last known good.
4. Add a synthetic test to CI to cover regression.

## Release
- CI passes: lint + tests
- `make build` and push image
- Helm upgrade with canary traffic, then promote
