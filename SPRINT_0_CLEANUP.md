# Sprint 0: Cleanup & Foundation

**Sprint Duration**: January 13-24, 2025  
**Goal**: Clean repository, fix critical issues, establish solid foundation

## 🎯 Sprint Objectives

1. Clean up repository and documentation
2. Fix all broken services
3. Implement database foundation
4. Establish testing infrastructure
5. Create clear development workflow

## 📋 Task Breakdown

### Day 1-2: Repository Cleanup

#### Git Cleanup Tasks:
```bash
# Review all changes
git status

# Commit keeper files
git add PROJECT_STATUS.md ROADMAP_2025.md SPRINT_0_CLEANUP.md
git commit -m "docs: Add comprehensive project cleanup and roadmap documentation"

# Remove obsolete files
git rm .claude/agents/*.md
git rm .claude/commands/*.md
git rm "Business Docs/Marketing Planning Docs/veria_gtm_strategy.md"
git rm "Business Docs/Research/*.md"
git rm ROADMAP_AND_SPRINTS.md STATUS.md
git rm docs/IMPLEMENTATION_GUIDE.md docs/PRD.md docs/PRD_v2.md
git commit -m "cleanup: Remove obsolete documentation and planning files"

# Review and commit service changes
git add services/
git commit -m "feat: Update service implementations"
```

#### Documentation Consolidation:
- [x] Create PROJECT_STATUS.md
- [x] Create ROADMAP_2025.md
- [x] Create SPRINT_0_CLEANUP.md
- [ ] Update README.md with current status
- [ ] Archive old sprint documents
- [ ] Update ARCHITECTURE.md

### Day 3-4: Fix Critical Services

#### Compliance Service (Priority 1):
**File**: `services/compliance-service/src/index.ts`

```typescript
// Required implementation:
- POST /api/v1/compliance/check
- POST /api/v1/compliance/decisions
- GET /api/v1/compliance/rules
- GET /api/v1/compliance/status/:id
```

#### Audit Service (Priority 2):
**File**: `services/audit-log-writer/src/index.ts`

```typescript
// Add missing endpoints:
- GET /api/v1/audit/logs
- GET /api/v1/audit/logs/:id
- GET /api/v1/audit/search
- Add pagination and filtering
```

#### Policy Service (Priority 3):
**File**: `services/policy-service/src/index.ts`

```typescript
// Database integration:
- Replace in-memory storage with PostgreSQL
- Implement proper CRUD operations
- Add data validation
```

### Day 5: Database Implementation

#### Schema Creation:
```sql
-- Core tables needed:
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rules JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES policies(id),
  result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id),
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Migration Setup:
```bash
# Install migration tools
pnpm add -D @veria/database knex

# Create migration files
npx knex migrate:make initial_schema

# Run migrations
npx knex migrate:latest
```

### Day 6-7: Testing Infrastructure

#### Unit Tests Setup:
```bash
# Each service needs:
- vitest.config.ts
- Basic test coverage (30% minimum)
- Test database configuration
- Mock data fixtures
```

#### Integration Tests:
```typescript
// tests/e2e/sprint0-verification.test.ts
describe('Sprint 0 Verification', () => {
  test('All services health checks pass')
  test('Database connections work')
  test('Service-to-service communication works')
  test('Gateway routing works correctly')
})
```

### Day 8-9: CI/CD Pipeline

#### GitHub Actions:
```yaml
# .github/workflows/ci.yml updates:
- Test all services
- Check TypeScript compilation
- Run linting
- Measure test coverage
- Build Docker images
```

#### Pre-commit Hooks:
```json
// package.json
"husky": {
  "hooks": {
    "pre-commit": "pnpm lint && pnpm typecheck",
    "pre-push": "pnpm test"
  }
}
```

### Day 10: Documentation & Handoff

#### Required Documentation:
- [ ] Updated README.md
- [ ] API documentation for all endpoints
- [ ] Database schema documentation
- [ ] Development environment setup guide
- [ ] Deployment procedures

#### Developer Onboarding:
- [ ] Setup instructions
- [ ] Architecture overview
- [ ] Coding standards
- [ ] Git workflow
- [ ] Testing guidelines

## 📊 Success Metrics

### Must Have (P0):
- ✅ All 5 core services running without errors
- ✅ Database schema implemented and migrated
- ✅ Health checks passing for all services
- ✅ Gateway routing working correctly
- ✅ Clean git repository

### Should Have (P1):
- ⏳ 30% test coverage
- ⏳ CI pipeline running
- ⏳ Basic integration tests
- ⏳ API documentation
- ⏳ Development guide

### Nice to Have (P2):
- ⏳ 50% test coverage
- ⏳ Performance benchmarks
- ⏳ Docker Compose optimized
- ⏳ Monitoring setup
- ⏳ Log aggregation

## 🚀 Daily Checklist

### Monday (Day 1):
- [ ] Git cleanup
- [ ] Remove obsolete files
- [ ] Commit changes

### Tuesday (Day 2):
- [ ] Documentation consolidation
- [ ] Update README
- [ ] Archive old docs

### Wednesday (Day 3):
- [ ] Fix Compliance Service
- [ ] Test endpoints
- [ ] Update gateway routes

### Thursday (Day 4):
- [ ] Fix Audit Service
- [ ] Fix Policy Service
- [ ] Integration testing

### Friday (Day 5):
- [ ] Create database schema
- [ ] Run migrations
- [ ] Test connections

### Monday (Day 8):
- [ ] Set up unit tests
- [ ] Write critical tests
- [ ] Check coverage

### Tuesday (Day 9):
- [ ] Update CI pipeline
- [ ] Add pre-commit hooks
- [ ] Test automation

### Wednesday (Day 10):
- [ ] Final documentation
- [ ] Team handoff
- [ ] Sprint review

## 🎯 Definition of Done

A task is considered complete when:
- [ ] Code is implemented and working
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Code is reviewed (if team > 1)
- [ ] Changes are committed to git

## 📝 Notes for Next Sprint

Based on Sprint 0 outcomes, Sprint 1 will focus on:
1. Expanding test coverage to 50%
2. Implementing authentication system
3. Adding WebAuthn support
4. KYC provider integration planning
5. Performance optimization

## 🆘 Blockers & Risks

### Potential Blockers:
- Database schema might need iterations
- Service dependencies could cause issues
- Test setup might take longer than expected

### Mitigation:
- Start with minimal schema, iterate
- Fix services in dependency order
- Focus on critical path tests first

---

**Sprint 0 Kickoff Checklist**:
- [ ] Review this plan with team
- [ ] Assign tasks to developers
- [ ] Set up daily standup (9:30 AM)
- [ ] Create tracking tickets
- [ ] Schedule sprint review (Jan 24, 3 PM)