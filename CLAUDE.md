# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
```bash
# Bootstrap development environment (Python + Node + hooks)
./scripts/setup_mac.sh
# or use Make target
make setup
```

### Python (FastAPI Service)
```bash
# Install dependencies
poetry install

# Run linting
poetry run ruff check packages/compliance_middleware
poetry run mypy packages/compliance_middleware

# Run tests
poetry run pytest -q

# Start FastAPI server locally
poetry run uvicorn packages.compliance_middleware.app:app --reload --port 8000
# or use Make target
make api
```

### Node.js (Edge Proxy)
```bash
# Build TypeScript
cd packages/edge_proxy && npm run build

# Start edge proxy
cd packages/edge_proxy && npm start
```

### Docker & Services
```bash
# Start all services
docker compose up -d
# or
make docker-up

# Build compliance middleware image
make build
```

### ClaudeFlow (Available via /Users/danielconnolly/Projects/claudeflow)
```bash
# Run claude-flow commands via npx (auto-resolves to alpha version)
npx claude-flow@alpha swarm "build me a REST API" --claude
npx claude-flow@alpha hive-mind wizard
npx claude-flow@alpha sparc tdd "compliance feature"

# Using local wrapper script
./claudeflow/claude-flow swarm "task description" --claude

# Example flow execution (if integrated)
make cf-run
```

## Architecture Overview

This is an **AI-native distribution & compliance middleware** for tokenized Real World Assets (RWAs), structured as a multi-service system:

### Core Components

**packages/compliance_middleware/** - FastAPI service (Python 3.11)
- Main compliance decision engine at `/decide` endpoint
- Audit logging system at `/audit` endpoint  
- Jurisdiction-based policy enforcement (US/EU/SG allowlist)
- Risk scoring and redaction capabilities
- Dependencies: FastAPI, Pydantic, Qdrant, Redis, HTTPX

**packages/edge_proxy/** - Lightweight gateway (Node.js + Fastify)
- Authentication and rate limiting
- Request signing and JWT handling
- TypeScript-based with Fastify framework

**packages/mcp/** - Model Context Protocol servers
- `compliance_policy.py` - Policy engine exposure
- `data_lineage.py` - Data tracking and lineage
- `task_graph.py` - Task orchestration

**claudeflow/** - AI orchestration and task automation templates
- Template YAML flow definitions for research, composition, and bundling
- Prompt templates for different workflow stages
- Integrates with `/Users/danielconnolly/Projects/claudeflow` - full claude-flow v2.0.0-alpha platform
- Claude-flow features: 87 MCP tools, hive-mind intelligence, neural networks, SPARC methodology
- Commands: `npx claude-flow@alpha swarm`, `hive-mind`, `sparc tdd`

### Key Patterns

- **Lineage Tracking**: All requests capture metadata (timestamp, path, jurisdiction, asset type, request ID)
- **Policy Decision Flow**: Jurisdiction-based allowlisting with risk scoring
- **Redaction System**: Automatic PII detection and redaction (e.g., SSN masking)
- **Multi-Service Architecture**: Python core + Node.js edge + Docker orchestration

### Testing

```bash
# Run all tests
make test

# Run specific test
poetry run pytest packages/compliance_middleware/tests/test_health.py
```

### Linting & Type Checking

```bash
# Run all linters
make lint

# Individual tools
poetry run ruff check packages/compliance_middleware
poetry run mypy packages/compliance_middleware
npx eslint packages/edge_proxy --ext .ts,.js
```

## Project Structure

- `packages/compliance_middleware/app.py` - Main FastAPI application
- `packages/edge_proxy/` - Node.js gateway service
- `packages/mcp/` - MCP protocol servers
- `claudeflow/` - AI orchestration templates (connects to full claude-flow platform)
- `infra/` - Docker and deployment configurations
- `docs/` - Product specifications and runbooks