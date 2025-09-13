# Tax Reporting Engine

## Overview
A tax engine that tracks tokenized asset gains/losses and generates tax-ready forms for CPAs and SMBs. This module automates tax reporting for tokenized assets with IRS-compliant outputs.

## Reference PRD
See `/docs/prds/tax_reporting_prd.md` for detailed requirements and specifications.

## Features
- Realized/unrealized gain tracking
- Short-term vs long-term gains classification
- Automatic form generation (8949, 1099, K-1)
- Jurisdiction-specific tax rules engine

## API Endpoints
- `GET /tax/liability` - Get current tax liability
- `POST /tax/forms/:type` - Generate tax forms
- `GET /tax/history` - Get transaction tax history

## Phase 2 Deliverables (Planned)
- [ ] Gain/loss calculation engine
- [ ] Tax form templates
- [ ] Multi-jurisdiction support
- [ ] Integration with QuickBooks Connector

## Setup
```bash
cd tax-engine
npm install
npm run dev
```

## Environment Variables
```
TAX_ENGINE_PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/veria_tax
```

## Development
The tax engine runs on port 3003 by default and provides tax calculation and reporting services.