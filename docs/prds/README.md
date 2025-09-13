# Veria Product Requirement Docs (PRDs)

This folder contains detailed PRDs for Veria’s first core modules.  
Blitzy can use these to scaffold features, build services, and track progress.  

## Included PRDs
- **QuickBooks Connector** (`quickbooks_connector_prd.md`)  
  Syncs tokenized asset transactions into QuickBooks/Xero.  

- **Compliance Dashboard** (`compliance_dashboard_prd.md`)  
  Web dashboard with real-time tokenized asset + compliance visibility.  

- **Tax Reporting Engine** (`tax_reporting_prd.md`)  
  Automates IRS-ready tax forms for tokenized assets.  

- **API Gateway & Middleware** (`api_gateway_prd.md`)  
  API-first layer for fintech, CPA, and enterprise integrations.  

## How to Use with Blitzy
1. Load this repo into Blitzy.  
2. Review the PRDs in this folder.  
3. Scaffold these directories at the root of the repo:
   - `/connectors/quickbooks`
   - `/dashboard`
   - `/tax-engine`
   - `/api-gateway`
4. Follow the **inputs/outputs, APIs, and success criteria** in each PRD.  
5. First 90-day sprint recommendation:
   - Sprint 1: QuickBooks Connector MVP + Compliance Dashboard scaffold
   - Sprint 2: Tax Engine + Export Reports
   - Sprint 3: Harden APIs + Multi-tenant roles

## Next Steps
- Add new PRDs here as features are defined.  
- Keep docs + code in sync.  
- Consider later splitting into a separate `veria-docs` repo if adoption grows.
