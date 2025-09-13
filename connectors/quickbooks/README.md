# QuickBooks Connector

## Overview
This module provides integration with QuickBooks Online to sync tokenized asset transactions into existing accounting software. It creates journal entries and generates reconciliation reports for CPAs and SMBs.

## Reference PRD
See `/docs/prds/quickbooks_connector_prd.md` for detailed requirements and specifications.

## Features
- OAuth 2.0 authentication flow for QuickBooks Online
- Chart of Accounts synchronization
- Transaction import and classification
- Reconciliation report generation

## API Endpoints
- `POST /connectors/quickbooks/auth` - Initiate OAuth authentication
- `GET /connectors/quickbooks/sync` - Sync transactions from blockchain
- `POST /connectors/quickbooks/export` - Generate reconciliation reports

## Sprint 1 Deliverables
- [x] OAuth flow implementation
- [x] Basic Chart of Accounts sync
- [x] Mock transaction import
- [x] Reconciliation report export

## Setup
```bash
cd connectors/quickbooks
npm install
npm run dev
```

## Environment Variables
```
QB_CLIENT_ID=your_quickbooks_client_id
QB_CLIENT_SECRET=your_quickbooks_client_secret
QB_REDIRECT_URI=http://localhost:3001/auth/callback
```

## Development
The connector runs on port 3001 by default and provides a REST API for integration with the main Veria platform.