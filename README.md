
# AI-Native Distribution & Compliance Middleware — Bundle (v3)

This is the **downloadable starter bundle** aligned to our last chat. It:
- **Drops v4**; v3 is the latest in this bundle.
- Integrates **claudeflow** (replacing DevAssist).
- Includes a hardened project template, CI, Dagger stubs, MCP servers, and local-first scripts for macOS.
- Adds extra elements we discussed: prompts, flows, infra, LaunchAgents, and compliance checklists.

> **Local paths referenced earlier** (e.g., `/Users/danielconnolly/Projects/ProjectTemplate/`) cannot be read by this bundle (sandboxed),  
> but the structure below is designed to be synced into your local repos. You can copy desired subfolders into:
> - `/Users/danielconnolly/Projects/ProjectTemplate/`
> - `/Users/danielconnolly/Projects/claudeflow/`
> - `/Users/danielconnolly/Projects/` (general workspace)

## Quickstart

```bash
# macOS setup (create venv, install deps, prepare git hooks)
./scripts/setup_mac.sh

# Run services (local dev)
docker compose up -d

# Start the API (FastAPI) locally
uvicorn packages.compliance_middleware.app:app --reload

# Run claudeflow flows locally (example)
claudeflow run flows/composer/01_bootstrap.yaml
```

## Contents

- `packages/compliance_middleware` — FastAPI service (RWA distribution/compliance core), Python 3.11, Poetry.
- `packages/edge_proxy` — lightweight edge gateway (Node + Fastify) for auth/rate limiting & request signing.
- `packages/mcp` — Model Context Protocol servers (CompliancePolicy, DataLineage, TaskGraph).
- `claudeflow/` — **Flows** and prompts replacing DevAssist; end-to-end task graphs and verifiers.
- `infra/` — Dagger build stubs, GitHub Actions CI, Docker, Helm charts (scaffolds).
- `scripts/` — macOS helpers (Colima, LaunchAgents, env bootstrap).
- `docs/` — product spec, research notes template, compliance checklists, and runbooks.
- `.github/workflows` — CI pipeline.
- `Makefile` — common tasks.

---

**Date:** 2025-09-01 22:29:29  
**Maintainer:** Daniel + ChatGPT
