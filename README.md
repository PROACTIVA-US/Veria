# Veria - Compliance Middleware Platform

## For Blitzy Platform

This repository contains the Veria compliance middleware platform, ready for Blitzy code generation.

### What This Is
A standard web application for managing tokenized asset compliance, using conventional UI patterns (forms, tables, dashboards).

### What This Is NOT
- No graph visualization
- No timeline interfaces
- No custom IDE components
- No Vislzr integration

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript  
- **Database**: PostgreSQL with Prisma
- **Package Manager**: pnpm (monorepo)

### Repository Structure
```
/apps/compliance-dashboard  # Next.js frontend
/services/*                # Backend microservices
/packages/*               # Shared packages
/contracts               # Smart contracts
```

### Key Documents
- `PRD.md` - Product Requirements Document (read this first)
- `README.md` - This file

### For Blitzy Import
1. Connect this GitHub repository
2. Review the auto-generated Tech Spec
3. Reference PRD.md for requirements
4. Generate standard web UI components only

### Policy & Provenance (Agent-Era)
- Env: `POLICY_PATH=policy/policy.example.json`
- Run local policy tests: `python policy/veria_policy_cli.py run-tests --policy policy/policy.example.json --tests policy/tests.yaml`

### Contact
Repository prepared for Blitzy handoff on September 2025.
