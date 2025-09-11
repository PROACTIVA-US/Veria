# Veria - RWA Distribution Middleware

## 🎯 Mission
Build the "Plaid for tokenized funds" - AI-native distribution & compliance middleware connecting institutions to the $24B tokenized Real World Asset (RWA) market.

## 📊 Current Status
**Version**: 0.4.0  
**Phase**: Sprint 0 - Cleanup & Foundation  
**Completion**: ~40%  
**Target MVP**: November 1, 2025

## 🏗️ Project Overview

Veria is a comprehensive middleware platform that bridges traditional financial institutions with tokenized Real World Assets on the blockchain. It provides seamless integration, compliance automation, and intelligent distribution capabilities.

### Key Features
- **ERC-3643 Compliance**: Full support for security token standards
- **Multi-Chain Support**: Initially Polygon, expandable to other EVM chains
- **AI-Powered Compliance**: Automated KYC/AML and regulatory compliance
- **Real-Time Settlement**: Instant transaction processing and settlement
- **Enterprise Integration**: APIs for seamless institution connectivity

### 📈 Development Progress
- ✅ Core service architecture implemented
- ✅ Basic authentication system
- ✅ Gateway routing operational
- 🔄 Database integration in progress
- 🔄 Compliance engine development
- ⏳ Blockchain integration pending
- ⏳ Frontend dashboard pending

## 🏛️ Architecture

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
│  Identity | Policy | Compliance │
│        Audit Writer             │
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

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- pnpm v8+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/PROACTIVA-US/Veria.git
cd Veria

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
pnpm --filter @veria/policy-service prisma:generate

# Start development services
pnpm run dev:all
```

### Service Endpoints

| Service | Port | Health Check |
|---------|------|--------------|
| Gateway | 3001 | http://localhost:3001/health |
| Identity | 3002 | http://localhost:3002/health |
| Policy | 3003 | http://localhost:3003/health |
| Compliance | 3004 | http://localhost:3004/health |
| Audit | 3005 | http://localhost:3005/health |
| Frontend | 3000 | http://localhost:3000 |

## 📂 Project Structure

```
veria/
├── apps/               # Frontend applications
│   └── frontend/      # Next.js admin dashboard
├── services/          # Backend microservices
│   ├── gateway/       # API gateway
│   ├── identity-service/  # KYC/Identity management
│   ├── policy-service/    # Policy engine
│   ├── compliance-service/# Compliance checks
│   └── audit-log-writer/  # Audit trail
├── packages/          # Shared packages
├── infra/            # Infrastructure configs
├── scripts/          # Utility scripts
├── docs/             # Documentation
└── tests/            # Test suites
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific service tests
pnpm --filter @veria/gateway test

# Run e2e tests
pnpm test:e2e

# Run performance tests
pnpm test:perf
```

## 🐳 Docker

```bash
# Build all services
docker compose build

# Start all services
docker compose up

# Start specific service
docker compose up gateway
```

## 📊 Development Status

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for current state assessment.  
See [ROADMAP_2025.md](ROADMAP_2025.md) for complete development roadmap.  
See [SPRINT_0_CLEANUP.md](SPRINT_0_CLEANUP.md) for immediate action items.

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and patterns
- [API Documentation](docs/API.md) - REST API reference
- [Database Schema](docs/DATABASE_SCHEMA.md) - Data models
- [Roadmap](ROADMAP_AND_SPRINTS.md) - Development timeline
- [Product Spec](docs/PRODUCT_SPEC.md) - Feature specifications

## 🤝 Contributing

This is a private repository. Team members should follow the established development workflow:

1. Create feature branch from `main`
2. Implement changes with tests
3. Submit PR for review
4. Merge after approval

## 📄 License

Proprietary - All Rights Reserved

## 🏢 About PROACTIVA

PROACTIVA is building the future of tokenized asset distribution, making Real World Assets accessible to institutions worldwide through compliant, efficient, and intelligent middleware solutions.

---

**Repository**: https://github.com/PROACTIVA-US/Veria  
**Status**: Active Development  
**Version**: 0.4.0
