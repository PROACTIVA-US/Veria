---
description: Start a new AI Compliance Middleware development session with DevAssist tracking
---

Start a new development session for the AI Compliance Middleware system with automatic DevAssist MCP integration.

Execute the session manager start command:
```bash
!/Users/danielconnolly/Projects/ai-compliance-middleware/scripts/session-manager.sh start
```

This will:
1. Create a new session file
2. Check git status  
3. Review STATUS.md for current priorities
4. Run DevAssist analysis for drift/anti-patterns
5. Set up session tracking
6. Display key commands for the project
7. Note: DevAssist MCP auto-connects via Claude Code

After starting, review the development documentation:
```bash
cat /Users/danielconnolly/Projects/ai-compliance-middleware/CLAUDE.md
```

Key Project Commands:
- **make api** - Start FastAPI server on port 8000
- **make test** - Run all tests
- **make lint** - Check code quality
- **make docker-up** - Start all services
- **make setup** - Bootstrap development environment

Service Architecture:
- **FastAPI**: Compliance decision engine (Python)
- **Edge Proxy**: Gateway with auth & rate limiting (Node.js)
- **MCP Servers**: Model Context Protocol integrations
- **ClaudeFlow**: AI orchestration templates

Session Management:
- Max 2 hours per session
- New session after major features
- Auto-cleanup on session end
- Test coverage target: >80%

Key endpoints:
- `/decide` - Compliance decision endpoint
- `/audit` - Audit logging  
- `/health` - Service health check

DevAssist will track:
- Architectural decisions
- API performance metrics
- Code patterns
- Anti-patterns
- Test coverage
