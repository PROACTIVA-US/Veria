# Veria Compliance Dashboard

## Overview
A web dashboard for accountants, SMBs, and auditors to view tokenized holdings, yields, and compliance status. This module provides real-time portfolio views, compliance indicators, and audit-ready report generation.

## Reference PRD
See `/docs/prds/compliance_dashboard_prd.md` for detailed requirements and specifications.

## Features
- Real-time portfolio view of tokenized assets
- Compliance status indicators (pass/fail)
- Role-based views (CPA, SMB, Auditor)
- One-click export to CSV/PDF/JSON formats

## API Endpoints
- `GET /dashboard/portfolio` - Get portfolio balances
- `GET /dashboard/compliance` - Get compliance results
- `POST /dashboard/export` - Generate reports

## Sprint 1 Deliverables
- [x] Next.js app scaffold
- [x] React UI with placeholder components
- [x] Portfolio balance view
- [x] Compliance status display
- [x] Export functionality stub

## Setup
```bash
cd dashboard
npm install
npm run dev
```

## Environment Variables
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_QB_CONNECTOR_URL=http://localhost:3001
```

## Development
The dashboard runs on port 3002 by default and connects to the API Gateway and QuickBooks Connector for data.