# Veria Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js v20+ 
- pnpm v8+
- Docker Desktop
- PostgreSQL client (optional)
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/PROACTIVA-US/Veria.git
cd Veria

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, Qdrant)
make docker-up

# Initialize database
make db-init

# Start all services
pnpm run dev:all
```

### Verify Setup

```bash
# Check service health
curl http://localhost:3001/health  # Gateway
curl http://localhost:3002/health  # Identity
curl http://localhost:3003/health  # Policy
curl http://localhost:3004/health  # Compliance
curl http://localhost:3005/health  # Audit
```

## 🏗️ Project Structure

```
veria/
├── services/           # Microservices
│   ├── gateway/       # API Gateway (port 3001)
│   ├── identity-service/  # Auth & KYC (port 3002)
│   ├── policy-service/    # Rules Engine (port 3003)
│   ├── compliance-service/# Compliance (port 3004)
│   └── audit-log-writer/  # Audit Trail (port 3005)
├── packages/          # Shared code
│   ├── database/      # DB models & queries
│   └── auth-middleware/   # Auth utilities
├── apps/             # Frontend apps
│   └── compliance-dashboard/
├── contracts/        # Smart contracts
├── infra/           # Infrastructure
├── tests/           # E2E tests
└── docs/            # Documentation
```

## 💻 Development Workflow

### 1. Creating a Feature

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ... edit files ...

# Run tests
pnpm test

# Check types
pnpm typecheck

# Lint code
pnpm lint

# Commit changes
git add .
git commit -m "feat: your feature description"
```

### 2. Working on a Service

```bash
# Start specific service in dev mode
pnpm run dev:gateway    # or identity, policy, compliance, audit

# Run service tests
pnpm --filter @veria/gateway test

# Watch mode for development
pnpm --filter @veria/gateway dev
```

### 3. Database Changes

```bash
# Create new migration
cd packages/database
npx knex migrate:make your_migration_name

# Run migrations
npx knex migrate:latest

# Rollback if needed
npx knex migrate:rollback

# Reset database
make db-reset
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Test specific service
pnpm --filter @veria/identity-service test
```

### Integration Tests
```bash
# Run E2E tests
pnpm test:e2e

# Run performance tests
pnpm test:perf
```

### Test Database
```bash
# Use test database for testing
DATABASE_URL=postgresql://veria:veria123@localhost:5432/veria_test pnpm test
```

## 🔧 Common Tasks

### Adding a New Endpoint

1. **Define Route** in `services/[service]/src/routes/`
```typescript
// services/gateway/src/routes/example.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const schema = z.object({
  name: z.string()
});

export const exampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/v1/example', async (request, reply) => {
    const data = schema.parse(request.body);
    // Implementation
    return { success: true, data };
  });
};
```

2. **Register Route** in service index
```typescript
// services/gateway/src/index.ts
import { exampleRoutes } from './routes/example.js';

app.register(exampleRoutes);
```

3. **Add Tests**
```typescript
// services/gateway/src/routes/example.test.ts
describe('Example Routes', () => {
  test('POST /api/v1/example', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/example',
      payload: { name: 'test' }
    });
    expect(response.statusCode).toBe(200);
  });
});
```

### Adding a Database Model

1. **Define Schema** in `packages/database/schemas/`
2. **Create Model** in `packages/database/src/models/`
3. **Add Queries** in `packages/database/src/queries/`
4. **Export** from `packages/database/src/index.ts`

### Environment Variables

Create `.env` file in service directory:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://veria:veria123@localhost:5432/veria
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

## 📝 Code Standards

### TypeScript
- Use strict mode
- Define types/interfaces
- Avoid `any` type
- Use async/await over callbacks

### Naming Conventions
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database tables: `snake_case`

### Git Commits
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

### Error Handling
```typescript
// Use Fastify error handling
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});
```

## 🐛 Debugging

### Service Logs
```bash
# View service logs
docker-compose logs -f gateway

# With timestamps
docker-compose logs -t gateway

# Last 100 lines
docker-compose logs --tail=100 gateway
```

### Database Queries
```bash
# Connect to database
psql postgresql://veria:veria123@localhost:5432/veria

# Common queries
\dt              # List tables
\d+ table_name   # Describe table
\q               # Quit
```

### Port Debugging
```bash
# Check if port is in use
lsof -i :3001

# Kill process on port
kill -9 $(lsof -t -i:3001)
```

## 🚢 Deployment

### Docker Build
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build gateway

# Run in production mode
docker-compose -f docker-compose.prod.yml up
```

### Health Checks
All services expose `/health` endpoint:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00Z",
  "service": "gateway",
  "version": "0.4.0"
}
```

## 📚 Resources

### Internal Docs
- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Roadmap](ROADMAP_2025.md)

### External Resources
- [Fastify Docs](https://www.fastify.io/)
- [Zod Validation](https://zod.dev/)
- [Vitest Testing](https://vitest.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## 🆘 Troubleshooting

### Service Won't Start
1. Check if port is already in use
2. Verify dependencies installed: `pnpm install`
3. Check environment variables
4. Review logs: `pnpm run dev:gateway`

### Database Connection Failed
1. Ensure Docker is running: `docker ps`
2. Check PostgreSQL is up: `make docker-ps`
3. Verify connection string in `.env`
4. Test connection: `psql $DATABASE_URL`

### Tests Failing
1. Reset test database: `make db-reset`
2. Clear cache: `pnpm store prune`
3. Reinstall dependencies: `rm -rf node_modules && pnpm install`
4. Check for uncommitted changes: `git status`

## 👥 Team Contacts

- **Project Lead**: [Contact]
- **Backend Team**: [Contact]
- **DevOps**: [Contact]
- **Product**: [Contact]

## 📅 Sprint Schedule

- **Daily Standup**: 9:30 AM
- **Sprint Planning**: Monday, Week 1
- **Sprint Review**: Friday, Week 2
- **Retrospective**: Friday, Week 2

---

For questions or issues, check [SPRINT_0_CLEANUP.md](SPRINT_0_CLEANUP.md) for current priorities.