# CLAUDE.md - AI Development Assistant Instructions

## 🎯 Project Context
You are assisting with Veria, a tokenized RWA (Real World Assets) distribution platform focusing on treasuries and money market funds. We're building the "Plaid for tokenized funds" - connecting traditional finance to blockchain.

## 📊 Current Development Status

### Active Sprint: Database Foundation (Week 1 of 8)
- **Current Day**: Day 1 - Database Schema Implementation
- **Sprint Goal**: Complete data persistence layer
- **Critical Path**: Database → Gateway → Smart Contracts → Identity Service

### Today's Priority Tasks:
1. Create PostgreSQL schema for all entities
2. Implement user and organization tables
3. Set up Alembic migrations
4. Begin SQLAlchemy model implementation

## 🏗️ Project Structure
```
/Users/danielconnolly/Projects/Veria/
├── apps/frontend/          # Next.js dashboard (empty, Week 5)
├── services/
│   ├── gateway/           # API gateway (Week 2)
│   ├── identity-service/  # KYC/KYB (Week 4)
│   ├── policy-service/    # Compliance rules (Week 7)
│   └── audit-log-writer/  # Audit trail (Week 7)
├── packages/
│   ├── blockchain/        # Smart contracts (Week 3)
│   ├── database/         # Data layer (CURRENT FOCUS)
│   ├── compliance_middleware/
│   └── edge_proxy/
└── tests/                 # Testing suites (Week 6)
```

## 💻 Development Guidelines

### When Working on Database (Current Sprint):
1. **Schema First**: Always start with SQL schema definitions
2. **Migrations**: Use Alembic for all schema changes
3. **Models**: SQLAlchemy models must match schema exactly
4. **Testing**: Every table needs unit tests
5. **Performance**: Indexes on all foreign keys and commonly queried fields

### Code Standards:
- **Python**: Black formatter, type hints required
- **TypeScript**: Prettier, strict mode enabled
- **SQL**: Lowercase keywords, snake_case names
- **Tests**: Minimum 80% coverage required

### Security Requirements:
- PII must be encrypted at rest
- Use UUID for all primary keys
- Implement row-level security
- Audit log all data changes
- No sensitive data in logs

## 🚀 Sprint Information

### Current Sprint (Week 1): Database Foundation
**Files to Focus On:**
- `packages/database/schemas/core.sql` - Database schema
- `packages/database/models.py` - SQLAlchemy models
- `packages/database/migrations/` - Alembic migrations
- `packages/database/connection.py` - Connection pooling

**Key Decisions Needed:**
- Soft delete vs hard delete strategy
- Partition strategy for audit logs
- Index strategy for performance
- Cache invalidation approach

### Upcoming Sprints:
- **Week 2**: Gateway Service - JWT auth, routing, rate limiting
- **Week 3**: Smart Contracts - ERC-3643 implementation
- **Week 4**: Identity Service - KYC/KYB flow
- **Week 5**: Frontend - Investor dashboard
- **Week 6**: Integration Testing
- **Week 7**: Compliance Framework
- **Week 8**: Production Deployment

## 🎯 Success Metrics

### For Current Sprint:
- [ ] All tables created and indexed
- [ ] 100% migration success rate
- [ ] Query response time < 50ms
- [ ] 80% test coverage
- [ ] Documentation complete

### For MVP (Week 8):
- Complete investor onboarding flow
- Token subscription working end-to-end
- Compliance rules enforced
- Audit trail complete
- 99.9% uptime in staging

## 🔧 Technical Decisions Made

### Architecture:
- **Database**: PostgreSQL with Redis caching
- **API**: FastAPI (Python) with Fastify gateway (Node.js)
- **Blockchain**: Polygon for lower gas costs
- **Frontend**: Next.js with TypeScript
- **Testing**: Pytest, Jest, Playwright
- **CI/CD**: GitHub Actions
- **Hosting**: AWS/Kubernetes

### Key Integrations:
- **KYC**: Chainalysis/ComplyAdvantage
- **Documents**: Jumio/Onfido
- **Accreditation**: Parallel Markets
- **Blockchain**: Polygon Mumbai → Mainnet

## 📝 When Responding to Queries

### Always Include:
1. **File paths** for any code changes
2. **Test cases** for new functionality
3. **Migration scripts** for schema changes
4. **Documentation updates** in relevant .md files
5. **Performance implications** of changes

### Code Template for Database Work:
```python
# packages/database/models.py
from sqlalchemy import Column, String, UUID, ForeignKey, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Organization(Base):
    __tablename__ = 'organizations'
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Always include relationships
    users = relationship("User", back_populates="organization")
```

## 🚨 Common Issues & Solutions

### Database Connection Issues:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Migration Conflicts:
```bash
# Resolve conflicts
alembic downgrade base
alembic upgrade head

# Generate new migration
alembic revision --autogenerate -m "description"
```

## 📊 Progress Tracking

### Daily Checklist:
- [ ] Update STATUS.md with progress
- [ ] Commit code at least twice
- [ ] Run tests before committing
- [ ] Update documentation
- [ ] Note blockers in NEXT_STEPS.md

### End of Sprint Checklist:
- [ ] All acceptance criteria met
- [ ] Tests passing with >80% coverage
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Deployed to staging

## 🔐 Security Considerations

### For Database Sprint:
- Encrypt PII fields (SSN, passport, etc.)
- Use prepared statements only
- Implement connection pooling limits
- Set up database backup strategy
- Configure access logging

### Never Store:
- Private keys in database
- Unencrypted passwords
- Full credit card numbers
- Unencrypted PII
- API keys in code

## 💡 Helpful Context

### Business Goals:
- $10M ARR target in 3-5 years
- 40 enterprise customers @ $250k ACV
- Focus on treasuries and MMFs initially
- Expand to bonds and real estate later

### User Personas:
1. **Issuer Ops Lead**: Manages token issuance
2. **Compliance Officer**: Monitors regulations
3. **Integrator Engineer**: Implements APIs
4. **Investor**: Subscribes to products

### Compliance Requirements:
- KYC/KYB mandatory
- Accreditation verification
- Sanctions screening
- Transfer restrictions
- Audit trail for all actions

## 🚀 Commands for Development

### Database Development:
```bash
# Start database
cd packages/database
docker-compose up -d postgres redis

# Run migrations
alembic upgrade head

# Run tests
pytest tests/ -v

# Check coverage
pytest --cov=database tests/
```

### Start DevAssist Session:
```bash
./devassist-session.sh
# Or in Claude: /session-start
```

## 📅 Important Dates

- **Week 1 End**: Database complete (Sept 13)
- **Week 4 End**: Core services complete (Oct 4)
- **Week 8 End**: MVP complete (Nov 1)
- **Week 12**: First customer pilot (Dec 1)
- **Week 16**: Production launch (Jan 1)

## 🎯 Remember

1. **Database is the foundation** - Get it right the first time
2. **Security first** - Build it in, don't bolt it on
3. **Test everything** - Bugs found early are cheaper
4. **Document as you go** - Future developers will thank you
5. **Ask when stuck** - 30-minute rule before escalating

---

**Current Focus**: Complete database schema implementation TODAY. Start with `packages/database/schemas/core.sql`.

*Last updated: September 6, 2025*
*Sprint: 1 of 8 - Database Foundation*
*Day: 1 of 5*
