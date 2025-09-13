# API Gateway & Middleware

## Overview
The core middleware that exposes Veria services via APIs to fintechs, CPAs, and enterprises. Provides an API-first foundation for integrations with modular growth support.

## Reference PRD
See `/docs/prds/api_gateway_prd.md` for detailed requirements and specifications.

## Features
- Authentication via OAuth/JWT
- Role-based API access (CPA, SMB, auditor, fintech partner)
- Rate limiting and audit logs
- Multi-tenant SaaS support

## API Endpoints
- `GET /accounts/sync` - Sync accounting data
- `GET /assets/tokenized` - Fetch tokenized holdings
- `GET /reports/audit` - Get compliance reports
- `GET /tax/forms` - Get tax forms

## Phase 3 Deliverables (Planned)
- [ ] OAuth/JWT authentication
- [ ] Role-based access control
- [ ] Rate limiting middleware
- [ ] Multi-tenant support
- [ ] Audit logging

## Setup
```bash
cd api-gateway
npm install
npm run dev
```

## Environment Variables
```
API_GATEWAY_PORT=3000
JWT_SECRET=your_jwt_secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## Development
The API Gateway runs on port 3000 by default and serves as the main entry point for all Veria services.