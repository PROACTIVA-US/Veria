# Veria

AI-native distribution & compliance middleware for tokenized Real World Assets (RWAs).

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Edge Proxy (Node.js/Fastify)               │
│                    Authentication | Rate Limiting                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                  Compliance Middleware (Python/FastAPI)          │
│                 Policy Engine | Audit | Decisions                │
└──────────┬──────────────────────────────────────────┬────────────┘
           │                                          │
    ┌──────▼──────┐                          ┌───────▼───────┐
    │   Qdrant    │                          │     Redis     │
    │  (Vectors)  │                          │    (Cache)    │
    └─────────────┘                          └───────────────┘
```

## Quick Start

```bash
# Setup development environment
make setup

# Start all services
make docker-up

# Run API server
make api

# Run tests
make test
```

## Session Management

```bash
# Start development session
./scripts/session-manager.sh start

# Save checkpoint
./scripts/session-manager.sh checkpoint

# End session (autonomous)
./scripts/session-manager.sh end
```

## AI Orchestration with DevAssist

### Quick Tasks (Swarm Mode)
```bash
npx devassist swarm "implement /decide endpoint"
npx devassist swarm "add Redis caching" --claude
```

### Complex Projects (Hive-Mind Mode)
```bash
npx devassist hive-mind wizard    # Start project
npx devassist hive-mind status    # Check agents
npx devassist hive-mind resume    # Continue
```

## Project Structure

- `packages/compliance_middleware/` — Core FastAPI service (Python)
- `packages/edge_proxy/` — Edge gateway (Node.js/Fastify)
- `packages/mcp/` — Model Context Protocol servers
- `devassist/` — AI orchestration flows and prompts
- `scripts/` — Session management and utilities
- `.sessions/` — Session logs and terminal recordings
- `.swarm/` — DevAssist hive-mind memory

## Key Features

- **Compliance Engine**: Jurisdiction-based policy enforcement
- **Audit Logging**: Complete decision trail
- **Edge Proxy**: Authentication and rate limiting
- **AI Integration**: DevAssist for automated development
- **Session Management**: Context preservation across sessions

## API Endpoints

- `POST /decide` - Compliance decision endpoint
- `GET /audit` - Audit log retrieval
- `GET /health` - Service health check

## Development

- Max 2-hour sessions for optimal performance
- Test coverage target: >80%
- API response time: <200ms
- All commits must pass linting

## Technologies

- **FastAPI** - Python web framework
- **Fastify** - Node.js web server
- **Qdrant** - Vector database
- **Redis** - Caching layer
- **Docker Compose** - Service orchestration
- **DevAssist** - AI orchestration platform

## License

MIT