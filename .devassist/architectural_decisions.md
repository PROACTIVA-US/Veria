# Architectural Decisions Record (ADR)

## ADR-001: Session Management System
**Date**: 2025-01-03  
**Status**: Accepted  
**Context**: Need consistent session management across projects  
**Decision**: Implement bash-based session manager with DevAssist integration  
**Consequences**: 
- Consistent workflow across projects
- Automatic context preservation
- Session summaries for knowledge retention

## ADR-002: Multi-Service Architecture
**Date**: 2025-01-03  
**Status**: Accepted  
**Context**: Compliance middleware needs separation of concerns  
**Decision**: 
- FastAPI for core compliance logic (Python)
- Fastify for edge proxy (Node.js)
- MCP servers for AI integration
**Consequences**:
- Clear separation of responsibilities
- Language-appropriate implementations
- Scalable architecture

## ADR-003: Testing Strategy
**Date**: 2025-01-03  
**Status**: Proposed  
**Context**: Need comprehensive testing with >80% coverage  
**Decision**: 
- pytest for Python tests
- Jest for Node.js tests  
- Integration tests via Docker Compose
**Consequences**:
- High confidence in code quality
- Automated testing in CI/CD
- Clear test organization

## ADR-004: Development Workflow
**Date**: 2025-01-03  
**Status**: Accepted  
**Context**: Need structured development process  
**Decision**: 
- 2-hour maximum sessions
- Checkpoint after major features
- Auto-commit and push on session end
**Consequences**:
- Prevent fatigue and context loss
- Regular progress tracking
- Automatic backup to GitHub

## Template for New ADRs

## ADR-XXX: [Title]
**Date**: YYYY-MM-DD  
**Status**: [Proposed/Accepted/Deprecated/Superseded]  
**Context**: [Why this decision is needed]  
**Decision**: [What we decided to do]  
**Consequences**: [What happens as a result]  
**Alternatives Considered**: [Other options we evaluated]
