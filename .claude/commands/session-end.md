---
description: End the current AI Compliance Middleware session with automatic summary and DevAssist update
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
2. Run DevAssist session analysis
3. Check for architectural decisions
4. Save learned patterns to .devassist/
5. **AUTO-CLEANUP project structure** (moves stray files)
6. Commit changes to git (if requested)
7. Prompt for GitHub push
8. Clean up session markers

Sprint Rotation Reminder:
- If major feature completed, START NEW CLAUDE SESSION
- Max 2 hours per session for optimal performance
- Check test coverage: `poetry run pytest --cov`

Remember to update `.devassist/architectural_decisions.md` if any ADRs were made!

Performance check: 
- API response time < 200ms?
- Test coverage > 80%?
- All linters passing?
