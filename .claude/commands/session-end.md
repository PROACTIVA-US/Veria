---
description: End the current AI Compliance Middleware session with automatic summary and ClaudeFlow state preservation
---

End the current development session by running the session manager with automatic summary generation.

First, provide a summary of what was accomplished, key decisions, performance metrics, and next priorities.

Then execute:
```bash
!/Users/danielconnolly/Projects/ai-compliance-middleware/scripts/session-manager.sh end
```

When prompted, use these responses based on the session's work:
- **What completed**: [Major accomplishments, e.g., "Implemented /decide endpoint", "Added Redis caching", "Created MCP server"]
- **Key decisions**: [Architectural choices, e.g., "Use Qdrant for vector storage", "JWT for authentication", "Fastify for edge proxy"]
- **Performance metrics**: [If tested, e.g., "API response: 45ms", "Test coverage: 85%", "Docker startup: 12s"]
- **Blockers**: [Issues encountered, e.g., "Redis connection timeout", "TypeScript compilation errors", "Poetry dependency conflicts"]
- **Next priorities**: [Top 3 tasks, e.g., "1. Add rate limiting 2. Implement audit logging 3. Create integration tests"]

The session manager will:
1. Save session summary
2. Check ClaudeFlow hive-mind state (.swarm/)
3. Preserve SQLite memory database
4. **AUTO-CLEANUP project structure** (moves stray files)
5. Commit changes to git (if requested)
6. Prompt for GitHub push
7. Clean up session markers

## ClaudeFlow State Preservation

If you've been using hive-mind mode, the following will be preserved:
- `.swarm/memory.db` - SQLite database with 12 specialized tables
- `.swarm/queen.json` - Queen configuration
- `.swarm/workers/` - Worker agent states
- `.swarm/logs/` - Execution logs

To resume in next session:
```bash
npx claude-flow@alpha hive-mind resume
```

## Sprint Rotation Reminder
- If major feature completed, START NEW CLAUDE SESSION
- Max 2 hours per session for optimal performance
- Check test coverage: `poetry run pytest --cov`

## Performance Checklist
- API response time < 200ms?
- Test coverage > 80%?
- All linters passing?
- Docker services healthy?

## Quick Cleanup Tasks
If needed before ending:
```bash
# Run tests
make test

# Check linting
make lint

# Format code
poetry run black packages/compliance_middleware
npx prettier --write packages/edge_proxy/src
```

Remember: ClaudeFlow hive-mind memory persists across sessions!