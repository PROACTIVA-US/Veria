# Veria Project - Blitzy Handoff Package

## Project Overview
Veria is a compliance-first middleware platform for tokenized asset management with a standard web UI.

## What's Included for Blitzy

### 1. Core Documentation
- `veria_master_prd_stdUI.md` - Complete Product Requirements Document
- `veria_prd.json` - Structured PRD for Blitzy import
- `veria_tasks.json` - Task graph for Blitzy pipeline generation
- `Claude-prompt-veria-frontend.md` - Original requirements specification

### 2. Clean Codebase Structure
```
/apps
  /compliance-dashboard    # Next.js frontend application
/services
  /ai-broker              # AI broker service
  /audit-log-writer       # Audit logging service
  /blockchain-service     # Blockchain integration
  /compliance-service     # Compliance engine
  /gateway               # API gateway
  /graph-service         # Graph database service
  /identity-service      # Identity management
  /kyc-provider         # KYC/KYB integration
  /policy-service       # Policy engine
  /regulatory-reporting # Regulatory reporting
  /tool-masker         # Data masking service
/packages
  /auth-middleware      # Authentication middleware
  /database            # Database utilities
  /edge_proxy         # Edge proxy
  /sdk-ts            # TypeScript SDK
/contracts            # Smart contracts
/tests
  /e2e               # End-to-end tests
  /k6                # Performance tests
```

### 3. Technology Stack (Blitzy-Compatible)
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Smart Contracts**: Solidity
- **Package Manager**: pnpm (monorepo with workspaces)
- **Testing**: Jest, Playwright (e2e), K6 (performance)

## Blitzy Import Instructions

### Step 1: GitHub Repository Connection
1. Ensure the repository is pushed to GitHub
2. Grant Blitzy access to the repository
3. Blitzy will automatically map dependencies and build the codebase representation

### Step 2: Technical Specification Review
1. Blitzy will generate a Tech Spec from the codebase
2. Review and edit the generated specification
3. Ensure it reflects the core features:
   - Onboarding Wizard flow
   - Evidence management system
   - Investor registry with KYC/KYB
   - Tokenization adapter
   - Jurisdictional compliance rules

### Step 3: Prompt Structure for Enhancements

Use this template for any new features:

```
WHY (Vision & Purpose):
- Enhance Veria's compliance-first middleware for tokenized assets
- Ensure regulatory compliance across jurisdictions
- Streamline investor onboarding and asset tokenization

WHAT (Core Requirements):
- [Specific feature requirements]
- [Integration points with existing services]
- [Compliance requirements]

HOW (Technical Implementation):
- Use existing TypeScript/Node.js backend services
- Integrate with Next.js frontend at /apps/compliance-dashboard
- Follow existing patterns in /services directory
- Maintain monorepo structure with pnpm workspaces
```

## Files to Focus On

### Priority 1 - Core Configuration
- `/package.json` - Root monorepo configuration
- `/pnpm-workspace.yaml` - Workspace configuration
- `/apps/compliance-dashboard/package.json` - Frontend dependencies
- `/apps/compliance-dashboard/app/` - Next.js app directory

### Priority 2 - Service Definitions
- `/services/*/src/index.ts` - Service entry points
- `/services/*/package.json` - Service dependencies
- `/packages/*/src/` - Shared packages

### Priority 3 - Documentation
- `veria_master_prd_stdUI.md` - Complete requirements
- `/services/*/README.md` - Service documentation

## Excluded from Handoff
The following have been excluded for clean handoff:
- `.worktrees/` - Git worktrees (excluded via .cursorignore)
- `node_modules/` - Dependencies (will be reinstalled)
- `.next/` - Build outputs
- `dist/` - Compiled code
- Archive and bundle directories

## Human Engineering Tasks (Post-Blitzy)
Based on Blitzy's typical output, expect these remaining tasks:
1. Security audit and penetration testing
2. Production deployment configuration
3. Third-party API keys and credentials setup
4. Legal/compliance review of smart contracts
5. Performance optimization and monitoring setup

## Contact for Handoff
- Repository: [Your GitHub URL]
- Last Updated: September 2025
- Stack Verification: TypeScript, Node.js, Next.js (all Blitzy-optimized)

## Next Steps
1. Push to GitHub if not already done
2. Connect Blitzy to the repository
3. Review and approve the generated Tech Spec
4. Use the prompt template above for any modifications
5. Blitzy will generate ~80% of required code
6. Complete human engineering tasks for production readiness
