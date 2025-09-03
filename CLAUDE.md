# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Management

### Start Session
```bash
# Use Claude Code custom command
/session-start

# Or directly in terminal
./scripts/session-manager.sh start
```

### End Session
```bash
# Use Claude Code custom command  
/session-end

# Or directly with auto-summary
./scripts/session-manager.sh end "completed" "decisions" "metrics" "blockers" "priorities"
```

### Checkpoint Progress
```bash
/session-checkpoint
# Or
./scripts/session-manager.sh checkpoint
```

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

## DevAssist AI Orchestration (v2.0.0 Alpha)

DevAssist provides AI-powered development assistance with swarm intelligence and neural networks.

### Quick Tasks (Swarm Mode)
For single objectives and rapid implementation:
```bash
# Generate code
npx claude-flow@alpha swarm "implement /decide endpoint with jurisdiction checking"

# Add features
npx claude-flow@alpha swarm "add Redis caching to improve API performance" --claude

# Write tests
npx claude-flow@alpha swarm "create integration tests for compliance flow"

# Fix issues
npx claude-flow@alpha swarm "debug TypeScript compilation errors in edge proxy"
```

### Complex Projects (Hive-Mind Mode)
For persistent sessions with specialized agents:
```bash
# Start interactive wizard
npx claude-flow@alpha hive-mind wizard

# Check agent status
npx claude-flow@alpha hive-mind status

# Resume previous session
npx claude-flow@alpha hive-mind resume

# View memory
sqlite3 .swarm/memory.db "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;"
```

### Project-Specific Flows
Located in `devassist/flows/`:
```bash
# Bootstrap project structure
devassist run flows/composer/01_bootstrap.yaml

# Research RWA market landscape
devassist run flows/research/10_rwa_market_landscape.yaml

# Build deployment artifacts
devassist run flows/bundling/90_build_artifact.yaml
```

### DevAssist Features
- **🐝 Hive-Mind Intelligence**: Queen-led coordination with worker agents
- **🧠 Neural Networks**: 27+ cognitive models with WASM acceleration
- **🔧 87 MCP Tools**: Comprehensive automation toolkit
- **💾 SQLite Memory**: Persistent context in `.swarm/memory.db`
- **🔄 Dynamic Agents**: Self-organizing with fault tolerance
- **🪝 Hooks System**: Pre/post operation automation

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

**devassist/** - AI orchestration templates
- YAML flow definitions for research, composition, and bundling
- Prompt templates for different workflow stages
- Integrates with `/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP`

### Key Patterns

- **Lineage Tracking**: All requests capture metadata (timestamp, path, jurisdiction, asset type, request ID)
- **Policy Decision Flow**: Jurisdiction-based allowlisting with risk scoring
- **Redaction System**: Automatic PII detection and redaction (e.g., SSN masking)
- **Multi-Service Architecture**: Python core + Node.js edge + Docker orchestration
- **AI-Powered Development**: DevAssist for automated code generation and testing

### Testing

```bash
# Run all tests
make test

# Run specific test
poetry run pytest packages/compliance_middleware/tests/test_health.py

# Coverage report
poetry run pytest --cov=packages/compliance_middleware
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

```
ai-compliance-middleware/
├── packages/
│   ├── compliance_middleware/  # Python FastAPI
│   ├── edge_proxy/            # Node.js Fastify
│   └── mcp/                   # MCP servers
├── devassist/                # AI orchestration flows
│   ├── flows/                 # YAML workflow definitions
│   └── prompts/              # Prompt templates
├── scripts/
│   └── session-manager.sh     # Session management
├── .claude/
│   └── commands/              # Claude Code slash commands
├── .sessions/                 # Session logs
├── .swarm/                    # DevAssist hive-mind memory
│   ├── memory.db             # SQLite persistence
│   ├── queen.json            # Queen configuration
│   └── workers/              # Worker agent states
├── infra/                     # Docker and deployment
└── docs/                      # Documentation
```

## Session Guidelines

1. **Start each session** with `/session-start`
2. **Use checkpoints** every 30 minutes or after major features
3. **End sessions** with `/session-end` for auto-summary
4. **Max 2 hours** per session for optimal performance
5. **DevAssist memory** persists in `.swarm/` across sessions

## Performance Targets

- API Response: <200ms
- Test Coverage: >80%
- Docker startup: <15s
- All linters passing