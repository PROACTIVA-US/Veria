# 🏦 Veria - Tokenized RWA Distribution Platform

> The "Plaid for tokenized funds" - Compliance-first distribution middleware for tokenized Real World Assets, starting with treasuries and money market funds.

[![Development Status](https://img.shields.io/badge/Status-Sprint%201%20of%208-yellow)](STATUS.md)
[![MVP Timeline](https://img.shields.io/badge/MVP-8%20weeks-blue)](ROADMAP_AND_SPRINTS.md)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

## 🎯 Vision

Veria is building the critical infrastructure layer that enables traditional financial institutions to distribute tokenized RWAs efficiently and compliantly. We're solving the $24B tokenized asset market's biggest challenge: seamless, compliant distribution at scale.

## 🚀 Current Development Status

**Sprint 1 of 8: Database Foundation** (Week 1)
- Building core data persistence layer
- PostgreSQL schema implementation
- Redis caching configuration
- Target: Complete by Friday, Sept 13

[View Detailed Roadmap →](ROADMAP_AND_SPRINTS.md)

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│     Client Applications         │
│   (RIAs, DAOs, Corporates)     │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│       Gateway Service           │
│   Auth | Rate Limit | Routing   │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│     Core Services               │
│  Identity | Policy | Audit      │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│     Blockchain Layer            │
│  ERC-3643 | Polygon | Events    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│       Data Layer                │
│  PostgreSQL | Redis | Qdrant    │
└─────────────────────────────────┘
```

## 📦 Project Structure

```
veria/
├── apps/
│   └── frontend/          # Next.js investor dashboard
├── services/
│   ├── gateway/          # API gateway (Fastify)
│   ├── identity-service/ # KYC/KYB service
│   ├── policy-service/   # Compliance engine
│   └── audit-log-writer/ # Immutable audit trail
├── packages/
│   ├── blockchain/       # Smart contracts & Web3
│   ├── database/        # Data models & migrations
│   ├── compliance_middleware/
│   └── edge_proxy/
├── tests/
│   ├── e2e/            # End-to-end tests
│   └── k6/             # Performance tests
└── docs/               # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+

### Development Setup

1. **Clone and Install**
```bash
git clone https://github.com/your-org/veria.git
cd veria
pnpm install
```

2. **Start Infrastructure**
```bash
docker-compose up -d
```

3. **Set Up Database**
```bash
cd packages/database
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

4. **Start Services**
```bash
# Terminal 1: Gateway
pnpm dev:gateway

# Terminal 2: Identity Service
pnpm dev:identity

# Terminal 3: Frontend
pnpm dev
```

5. **Run Tests**
```bash
pnpm test
```

## 🎯 Development Roadmap

### Phase 1: Foundation (Weeks 1-4) 🚧 CURRENT
- [x] Project setup and architecture
- [ ] **Sprint 1: Database layer** ← We are here
- [ ] Sprint 2: Gateway service
- [ ] Sprint 3: Smart contracts
- [ ] Sprint 4: Identity service

### Phase 2: Product (Weeks 5-8)
- [ ] Sprint 5: Frontend dashboard
- [ ] Sprint 6: Integration testing
- [ ] Sprint 7: Compliance framework
- [ ] Sprint 8: Production prep

### Phase 3: Launch (Weeks 9-12)
- [ ] Beta testing
- [ ] Security audit
- [ ] Customer pilot
- [ ] Production deployment

[View Detailed Sprints →](ROADMAP_AND_SPRINTS.md)

## 💻 Core Features

### For Issuers
- ✅ Token issuance and management
- ✅ Compliance rule configuration
- ✅ Investor whitelist management
- ✅ Distribution analytics

### For Investors
- ✅ KYC/KYB onboarding
- ✅ Product marketplace
- ✅ Portfolio management
- ✅ Transaction history

### For Compliance
- ✅ Real-time monitoring
- ✅ Automated reporting
- ✅ Audit trail
- ✅ Regulatory updates

## 🔧 Technology Stack

- **Backend**: Python (FastAPI), Node.js (Fastify)
- **Blockchain**: Solidity, Web3.js, Polygon
- **Frontend**: Next.js, TypeScript, TailwindCSS
- **Database**: PostgreSQL, Redis, Qdrant
- **Testing**: Pytest, Jest, Playwright
- **DevOps**: Docker, Kubernetes, GitHub Actions

## 📊 Key Metrics

- **Target**: $10M ARR in 3-5 years
- **Customers**: 40 enterprises @ $250k ACV
- **Performance**: <100ms API response, <$0.50 gas per tx
- **Reliability**: 99.9% uptime SLA
- **Security**: OWASP ASVS L2+ compliant

## 🤝 Contributing

We're currently in stealth development. For partnership inquiries, please contact the team.

### Development Workflow

1. Check [NEXT_STEPS.md](NEXT_STEPS.md) for immediate tasks
2. Review [STATUS.md](STATUS.md) for current sprint
3. Follow guidelines in [CLAUDE.md](CLAUDE.md) for AI assistance
4. Update documentation as you code

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation update
test: Test addition/modification
refactor: Code refactoring
perf: Performance improvement
```

## 📚 Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Testing Strategy](docs/Testing-Strategy.md)

## 🔐 Security

- All PII encrypted at rest
- JWT authentication with refresh tokens
- Row-level security in database
- Audit logging for all actions
- Regular security audits

## 📞 Contact & Support

- **Technical Issues**: Create a GitHub issue
- **Security Issues**: security@veria.io
- **Business Inquiries**: partnerships@veria.io

## 📄 License

Copyright © 2025 Veria. All rights reserved.

This is proprietary software. Unauthorized copying, modification, or distribution is strictly prohibited.

---

## 🎯 Current Sprint Focus

### Sprint 1: Database Foundation (Week 1)
**Goal**: Complete data persistence layer

**Today's Tasks**:
- [ ] Create PostgreSQL schema
- [ ] Implement core tables
- [ ] Set up migrations
- [ ] Configure Redis

[View Today's Tasks →](NEXT_STEPS.md)

---

*Building the future of tokenized asset distribution, one sprint at a time.*

**Last Updated**: September 6, 2025 | **Sprint**: 1 of 8 | **Target MVP**: November 1, 2025
