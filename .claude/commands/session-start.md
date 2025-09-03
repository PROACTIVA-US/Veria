---
description: Start a new AI Compliance Middleware development session with DevAssist AI orchestration
---

Start a new development session for the AI Compliance Middleware system with automatic DevAssist integration for AI-powered assistance.

Execute the session manager start command:
```bash
!/Users/danielconnolly/Projects/ai-compliance-middleware/scripts/session-manager.sh start
```

This will:
1. Create a new session file
2. Check git status  
3. Review STATUS.md for current priorities
4. Check DevAssist availability (v2.0.0 Alpha)
5. Detect hive-mind memory if present (.swarm/)
6. Set up session tracking
7. Display available DevAssist commands

After starting, review the development documentation:
```bash
cat /Users/danielconnolly/Projects/ai-compliance-middleware/CLAUDE.md
```

## DevAssist Commands

### Quick Tasks (Swarm Mode)
For single objectives and rapid implementation:
```bash
npx claude-flow@alpha swarm "implement /decide endpoint with jurisdiction checking"
npx claude-flow@alpha swarm "add Redis caching to improve API performance" --claude
npx claude-flow@alpha swarm "create integration tests for compliance flow"
```

### Complex Projects (Hive-Mind Mode)  
For persistent sessions with specialized agents:
```bash
npx claude-flow@alpha hive-mind wizard    # Interactive setup
npx claude-flow@alpha hive-mind status     # Check agent status
npx claude-flow@alpha hive-mind resume     # Continue previous session
```

### Project-Specific Flows
Run predefined workflows:
```bash
devassist run flows/composer/01_bootstrap.yaml
devassist run flows/research/10_rwa_market_landscape.yaml
devassist run flows/bundling/90_build_artifact.yaml
```

## Key Project Commands
- **make api** - Start FastAPI server on port 8000
- **make test** - Run all tests
- **make lint** - Check code quality
- **make docker-up** - Start all services
- **make setup** - Bootstrap development environment

## Service Architecture
- **FastAPI**: Compliance decision engine (Python)
- **Edge Proxy**: Gateway with auth & rate limiting (Node.js)
- **MCP Servers**: Model Context Protocol integrations
- **DevAssist**: AI orchestration with 87 MCP tools

## Session Management
- Max 2 hours per session
- New session after major features
- Auto-cleanup on session end
- Test coverage target: >80%
- Hive-mind memory persists in .swarm/

## Key Endpoints
- `/decide` - Compliance decision endpoint
- `/audit` - Audit logging  
- `/health` - Service health check

DevAssist Features:
- 🐝 Hive-mind swarm intelligence
- 🧠 27+ neural cognitive models
- 🔧 87 advanced MCP tools
- 💾 SQLite memory persistence
- 🔄 Dynamic agent architecture