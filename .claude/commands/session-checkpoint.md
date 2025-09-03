---
description: Save a checkpoint during the AI Compliance Middleware session
---

Save a progress checkpoint during the current AI Compliance Middleware development session.

Execute:
```bash
!/Users/danielconnolly/Projects/ai-compliance-middleware/scripts/session-manager.sh checkpoint
```

This will:
1. Prompt for a progress note
2. Save the checkpoint to the session file
3. Run a quick test check (pytest --co)
4. Check if API is running (health endpoint)
5. Check ClaudeFlow hive-mind status if active

## Use Checkpoints To
- Mark completion of subtasks
- Record performance measurements
- Note discovered issues
- Save before major changes
- Document API endpoint implementations
- Track ClaudeFlow agent progress

## Example Progress Notes
- "Implemented /decide endpoint with jurisdiction checking"
- "API response time: 45ms with Redis caching enabled"
- "Found issue: Poetry lock file conflicts with numpy version"
- "Added Qdrant vector storage integration"
- "Edge proxy authentication middleware complete"
- "Test coverage increased to 82%"
- "Docker compose configuration working with all services"
- "ClaudeFlow swarm completed database schema generation"
- "Hive-mind agents optimized API performance by 30%"

## Quick Status Checks

### Service Health
```bash
# API health
curl http://localhost:8000/health

# Edge proxy
curl http://localhost:3000/health

# Docker status
docker compose ps
```

### Test Status
```bash
# Quick test inventory
poetry run pytest --co -q

# Run specific test
poetry run pytest packages/compliance_middleware/tests/test_health.py

# Coverage report
poetry run pytest --cov=packages/compliance_middleware
```

### ClaudeFlow Status
```bash
# Check hive-mind agents
npx claude-flow@alpha hive-mind status

# View memory database
sqlite3 .swarm/memory.db "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;"

# Check worker logs
tail -n 20 .swarm/logs/latest.log
```

## When to Checkpoint
- ✅ After implementing a new endpoint
- ✅ When tests are passing
- ✅ Before refactoring
- ✅ After ClaudeFlow task completion
- ✅ When switching between services (API ↔ Edge Proxy)
- ✅ Before running destructive operations

Checkpoints help maintain context for both you and ClaudeFlow's memory system!