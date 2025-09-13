# Veria Compliance Dashboard PRD

## Overview
A web dashboard for accountants, SMBs, and auditors to view tokenized holdings, yields, and compliance status.

## Goals
- Provide transparency and trust in tokenized accounting.  
- Generate audit-ready reports.  
- Support multiple user roles.  

## User Stories
- *As a CPA*, I want to view my client’s tokenized asset compliance in one place.  
- *As an auditor*, I want to export a full compliance log.  
- *As an SMB owner*, I want to track tokenized income in real time.  

## Inputs / Outputs
- **Inputs**: Tokenized balances, transaction feeds, compliance engine outputs.  
- **Outputs**: Real-time dashboard, audit-ready PDF/CSV/JSON reports.  

## Features
- Real-time portfolio view of tokenized assets.  
- Compliance status indicators (pass/fail).  
- Role-based views (CPA, SMB, Auditor).  
- One-click report export.  

## APIs / Data Models
- `GET /dashboard/portfolio` – portfolio balances.  
- `GET /dashboard/compliance` – compliance results.  
- `POST /dashboard/export` – generate reports.  

## Success Criteria
- Multi-role dashboard accessible and functional.  
- Reports export correctly in multiple formats.  
