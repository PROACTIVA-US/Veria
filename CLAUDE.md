# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Veria is a Real World Asset (RWA) distribution middleware platform that bridges traditional financial institutions with tokenized assets on blockchain. It's built as a microservices architecture with TypeScript/Node.js services and follows ERC-3643 compliance standards.

## Architecture

The platform consists of 5 core microservices that communicate via HTTP:

1. **Gateway Service** (port 3001) - API gateway handling authentication, rate limiting, and request routing
2. **Identity Service** (port 3002) - KYC/AML and identity management
3. **Policy Service** (port 3003) - Policy engine for compliance rules
4. **Compliance Service** (port 3004) - Compliance verification and monitoring
5. **Audit Log Writer** (port 3005) - Immutable audit trail for all transactions

Additional services include:
- **Blockchain Service** - Smart contract interactions and Web3 integration
- **KYC Provider** - External KYC provider integrations
- **Tool Masker** - API abstraction layer for financial tools
- **Regulatory Reporting** - Compliance reporting automation

Services use Fastify framework, Zod for validation, and communicate through REST APIs. The data layer includes PostgreSQL (port 5432), Redis (port 6379), and Qdrant (port 6333) for vector storage.

## Development Commands

### Essential Commands
```bash
# Install dependencies (uses pnpm)
pnpm install

# Start all backend services
pnpm run dev:all

# Start individual services
pnpm run dev:gateway      # Gateway service
pnpm run dev:identity     # Identity service
pnpm run dev:policy       # Policy service
pnpm run dev:compliance   # Compliance service
pnpm run dev:audit        # Audit log writer

# Testing
pnpm test                 # Run all tests
pnpm test:e2e            # End-to-end tests
pnpm test:perf           # Performance tests

# Run tests for specific service
pnpm --filter @veria/[service-name] test
pnpm --filter @veria/[service-name] test:coverage

# Code quality - IMPORTANT: Always run before committing
pnpm lint                # Run linting (may show errors but won't fail)
pnpm typecheck           # TypeScript type checking

# Build
pnpm build               # Build all services
```

### Infrastructure Commands (via Makefile or Docker)
```bash
# Using Makefile (recommended)
make docker-up           # Start PostgreSQL, Redis, Qdrant
make docker-down         # Stop infrastructure
make db-init            # Initialize database schema
make db-seed            # Seed with test data
make db-migrate         # Run migrations
make db-reset           # Reset database (requires confirmation)
make db-health          # Check database health status

# Direct Docker commands
docker-compose up -d postgres redis qdrant  # Start infrastructure
docker-compose down                         # Stop all containers
docker-compose logs -f [service]           # View service logs
docker-compose ps                          # Show running containers
```

### Database Access
```bash
# PostgreSQL connection
Host: localhost
Port: 5432
Database: veria
User: veria
Password: veria123

# Redis
Host: localhost
Port: 6379

# Qdrant
HTTP: http://localhost:6333
gRPC: localhost:6334
```

## Project Structure

- `/services/` - Microservices (gateway, identity, policy, compliance, audit, blockchain, kyc-provider, tool-masker)
- `/apps/` - Frontend applications (compliance-dashboard)
- `/packages/` - Shared packages (database, auth-middleware)
- `/contracts/` - Smart contracts and blockchain code
- `/infra/` - Infrastructure configurations (Docker, Kubernetes, Terraform, database schemas)
- `/scripts/` - Utility and deployment scripts
- `/docs/` - Technical documentation (ARCHITECTURE.md, SPRINT_PLAN.md, ROADMAP.md)
- `/tests/` - E2E and performance test suites

## Service Development Patterns

### Service Structure
Each service follows this pattern:
```
service-name/
├── src/
│   ├── index.ts        # Entry point with Fastify server
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic
│   ├── config/         # Configuration management
│   └── types/          # TypeScript types
├── package.json        # Service dependencies
├── tsconfig.json       # TypeScript config
└── vitest.config.ts    # Test configuration
```

### Common Dependencies
- **Fastify** - Web framework (v4.25+)
- **Zod** - Schema validation
- **tsx** - TypeScript execution for development
- **vitest** - Test runner
- **pino** - Logging
- **@veria/database** - Shared database package (workspace dependency)
- **@veria/auth-middleware** - Shared auth middleware (workspace dependency)

### API Patterns
Services expose health checks at `GET /health` and follow RESTful conventions:
- `POST /api/v1/resource` - Create
- `GET /api/v1/resource/:id` - Read
- `PUT /api/v1/resource/:id` - Update
- `DELETE /api/v1/resource/:id` - Delete

Gateway routes proxy to services:
- `/api/identity/*` → Identity Service (3002)
- `/api/policies/*` → Policy Service (3003)
- `/api/compliance/*` → Compliance Service (3004)
- `/api/audit/*` → Audit Service (3005)

## Important Conventions

1. **TypeScript**: All services use TypeScript with strict mode enabled
2. **Module System**: ESM modules (`"type": "module"` in package.json)
3. **Validation**: Use Zod schemas for request/response validation
4. **Error Handling**: Fastify error handlers with proper HTTP status codes
5. **Testing**: Vitest for unit tests, coverage target 80%
6. **Monorepo**: pnpm workspaces for dependency management
7. **Imports**: Use `@fastify/` scoped packages (e.g., `@fastify/cors` not `fastify-cors`)
8. **Environment**: Services expect `.env` files or environment variables for configuration

## Current Development Status

**Sprint 1 of 7** - Foundation Repair Phase (Current)
- Focus: Fix broken services and establish working baseline
- Critical: Compliance Service needs index.ts implementation
- Audit Service needs read endpoints
- Policy Service needs database integration

Target MVP: November 1, 2025

See `/docs/SPRINT_PLAN.md` for detailed sprint breakdown and task assignments.