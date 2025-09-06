# @veria/audit-log-writer

Simple HTTP sink for audit events. Appends JSONL to `./.audit-data/audit.log` (configurable).

Env:
- `AUDIT_DIR` (default `./.audit-data`)

Dev:
```bash
pnpm --filter @veria/audit-log-writer dev
curl -X POST http://localhost:3005/audit -H 'content-type: application/json' -d '{"hello":"world"}'
```
