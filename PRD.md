# Veria Product Requirements Document

## Executive Summary

**Product**: Veria - Compliance Middleware Platform for Tokenized Assets  
**Version**: 1.0  
**Target**: Blitzy Platform Development  
**UI Type**: Standard Web Application (NO graph/timeline visualization)

## 1. Product Vision

Veria is a compliance-first middleware platform for managing tokenized real-world assets (RWAs), starting with Treasuries and Money Market Funds. It provides a **traditional web interface** with forms, tables, and dashboards for regulatory compliance, investor management, and asset tokenization.

## 2. Core Requirements

### 2.1 User Interface
- **Technology**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Design**: Standard web application patterns (forms, tables, cards, modals)
- **NO custom visualization tools, NO graph editors, NO timeline interfaces**

### 2.2 Core Features

#### Onboarding Wizard
Multi-step form flow:
1. Asset Configuration
2. Custody Setup  
3. SPV/Trust Creation
4. Tokenization Parameters
5. Investor Registry Setup
6. Evidence Collection

#### Compliance Dashboard
- Risk assessment cards
- Jurisdiction compliance status
- Audit trail table
- Document management interface

#### Investor Registry
- Data table with search/filter/sort
- KYC/KYB status tracking
- Eligibility verification forms
- Document upload interface

#### Evidence Management
- File upload/download
- ZIP export with manifest
- Signed URL generation
- Audit trail tracking

### 2.3 Backend Services
- **Gateway**: API gateway and routing
- **Identity Service**: Authentication and authorization
- **Compliance Service**: Rule engine and validation
- **Audit Service**: Event logging and tracking
- **KYC Provider**: Third-party integration
- **Blockchain Service**: Token operations

## 3. Technical Architecture

### 3.1 Monorepo Structure
```
/apps
  /compliance-dashboard    # Next.js frontend
/services
  /gateway                # API gateway
  /identity-service       # Auth service
  /compliance-service     # Compliance engine
  /audit-log-writer      # Audit logging
  /kyc-provider         # KYC integration
  /blockchain-service   # Blockchain ops
/packages
  /database            # Shared DB utilities
  /auth-middleware    # Auth middleware
  /sdk-ts            # TypeScript SDK
```

### 3.2 Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Package Manager**: pnpm (monorepo)
- **Testing**: Jest, Playwright, K6

## 4. User Workflows

### 4.1 Asset Onboarding
1. User logs in → Dashboard
2. Click "New Asset" → Onboarding Wizard
3. Complete multi-step form
4. Review and submit
5. System validates compliance
6. Asset created with audit trail

### 4.2 Investor Management
1. Navigate to Investor Registry
2. Add new investor via form
3. Upload KYC documents
4. System validates eligibility
5. Approve/reject with reason
6. Update investor status

### 4.3 Compliance Export
1. Select date range and filters
2. Click "Export Evidence"
3. System generates ZIP file
4. Download with manifest
5. Audit trail updated

## 5. Success Criteria

- First asset onboarding < 10 minutes
- Compliance export < 30 seconds
- All forms validate client-side and server-side
- 95% test coverage on critical paths
- Zero graph/visualization components

## 6. Blitzy Integration Notes

This PRD is designed for Blitzy's automated code generation:
- Standard web patterns Blitzy excels at
- TypeScript/Node.js stack (Blitzy-optimized)
- Traditional CRUD operations
- Form-based workflows
- No custom visualization requirements

## 7. Out of Scope

- Graph visualization tools
- Timeline interfaces  
- Visual IDE components
- Custom drawing tools
- Node/edge editors
- Any Vislzr-related features

---

**For Blitzy Platform**: This is a standard web application using conventional patterns. Focus on form-based workflows, data tables, and traditional dashboard components. All UI should use standard React components with Tailwind CSS styling.
