# API Gateway & Middleware PRD

## Overview
The core middleware that exposes Veria services via APIs to fintechs, CPAs, and enterprises.

## Goals
- Provide an API-first foundation for integrations.  
- Support modular growth across accounting, treasury, and compliance.  

## User Stories
- *As a fintech developer*, I want to query Veria APIs to embed compliance in my app.  
- *As a CPA*, I want API-driven access to compliance reports.  

## Inputs / Outputs
- **Inputs**: API calls from clients, accounting connectors, compliance engine.  
- **Outputs**: JSON responses for balances, reports, tax results.  

## Features
- Authentication via OAuth/JWT.  
- Role-based API access (CPA, SMB, auditor, fintech partner).  
- Rate limiting + audit logs.  
- Multi-tenant SaaS support.  

## APIs / Data Models
- `GET /accounts/sync` – sync accounting data.  
- `GET /assets/tokenized` – fetch holdings.  
- `GET /reports/audit` – compliance reports.  
- `GET /tax/forms` – tax forms.  

## Success Criteria
- API accessible with auth.  
- Endpoints return valid JSON matching docs.  
- Multi-tenant support tested with at least 3 orgs.  
