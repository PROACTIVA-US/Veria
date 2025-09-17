# Veria — Technical Specification v3 (Authoritative Roadmap)
**Date:** 2025-09-17
**Owner:** Daniel Connolly
**Repo:** PROACTIVA-US/Veria
**Environment (dev):** GCP veria-dev (project number 190356591245), region us-central1

**Status:** This is the authoritative Veria roadmap and technical specification going forward.

---

## 1) Executive Summary
Veria is an AI-native compliance & distribution middleware for tokenized real-world assets (RWAs), providing the critical infrastructure layer between traditional finance and tokenized assets. This v3 spec supersedes all previous versions and reflects reprioritized development focused on **data normalization**, **explainable AI (XAI)**, and initial deployment in the **U.S. tokenized Treasuries/MMF market**.

**Key Strategic Shifts**
- **Data Normalization + Explainable AI** as Phase 1 foundation
- **Beachhead Market:** U.S. tokenized Treasuries and Money Market Funds
- **Partner-Led Integration Strategy:** Fireblocks, Securitize, Plaid, Chainalysis/Elliptic
- **NLP-Powered Regulatory Change Management** from Day 1
- **Geographic Expansion:** U.S. → EU (MiCA) → APAC

**Current Infrastructure Facts**
- OIDC/WIF auth throughout; **no JSON keys**
- Deployments to Cloud Run are **by image digest** (not :latest)
- Organization policy requires **private-only** services (authenticated access)
- Working CI/CD pipeline with GitHub Actions

---

## 2) Product Vision & Market Position

### Vision
Become the universal compliance fabric for tokenized assets, enabling seamless regulatory adherence across jurisdictions while providing auditable, explainable AI-driven decisions.

### Market Position
- **Neutral Compliance Layer:** Platform-agnostic middleware that works with any custodian, tokenization platform, or blockchain
- **Trust Through Transparency:** Every compliance decision includes clear explanations, data sources, and regulatory references
- **Partnership Ecosystem:** Deep integrations with established players rather than competing with them

### Target Customers (12-24 Month Horizon)
1. **Phase 1-2:** Tokenized Treasury/MMF issuers (BlackRock BUIDL, Franklin Templeton OnChain)
2. **Phase 3:** Private credit platforms, real estate tokenization platforms
3. **Phase 4:** Custodians, exchanges, and broader TradFi institutions

---

## 3) Technical Roadmap (12-24 Months)

### Phase 1: Foundation First (Months 1-6)

#### Data Normalization Core
- **Multi-Source Integration Engine**
  - Custodians: Fireblocks, Anchorage, Coinbase Prime
  - Tokenization Platforms: Securitize, Broadridge ClearFi
  - Blockchains: Ethereum, Polygon, Stellar, ZKsync
  - Legacy Systems: Banking APIs, fintech platforms
- **Schema Mapping & Transformation**
  - Unified data model for cross-platform compatibility
  - Full audit trails for data lineage
  - Real-time and batch processing capabilities

#### Explainable AI (XAI) Framework
- **Interpretable Models**
  - Rules-based systems for clear regulatory mappings
  - Decision trees for transparent classification
  - SHAP/LIME explanations for ML-driven detections
- **Audit Trail Requirements**
  - Every decision outputs: rule applied, data trigger, outcome
  - Regulatory reference citations
  - Confidence scores and alternative paths

#### NLP-Powered Regulatory Change Management
- **Regulatory Monitoring**
  - Real-time ingestion: SEC, FINRA, MiCA, MAS, FATF updates
  - Document parsing and interpretation
  - Change impact analysis
- **Automated Rule Updates**
  - Auto-update compliance rules engine
  - Version control for regulatory changes
  - Rollback capabilities

#### Security & Privacy Foundation
- **Data Protection**
  - GDPR/CCPA-compliant PII handling
  - Encryption-at-rest and in-transit
  - Data residency controls
- **Access Control**
  - Fine-grained permissions
  - Audit logging for all access
  - Regulatory sandbox environments

#### Team Building
- Key hires: Data Engineering Lead, XAI Specialist, Regulatory NLP Engineer
- Advisory board: Regulatory experts, tokenization pioneers

### Phase 2: MVP & Beachhead Market (Months 7-12)

#### MVP Scope: U.S. Tokenized Treasuries & MMFs
- **Compliance API Suite**
  - KYC/AML onboarding (Plaid/Alloy integration)
  - Transaction screening (Chainalysis/Elliptic)
  - XAI-driven compliance reporting
  - Regulatory filing automation
- **Product Features**
  - Real-time compliance checks
  - Batch compliance reporting
  - Investor accreditation verification
  - Cross-border transaction validation

#### Partner API Integrations
- **Custody Integration (Fireblocks)**
  - Wallet management
  - Transaction signing workflows
  - Balance reconciliation
- **Issuance Platform (Securitize)**
  - Token lifecycle management
  - Corporate actions handling
  - Distribution management
- **Onboarding (Plaid)**
  - Bank account verification
  - Identity verification
  - Financial data aggregation
- **On-Chain Analytics (Chainalysis/Elliptic)**
  - Wallet screening
  - Transaction monitoring
  - Risk scoring

#### Pilot Programs
- Secure 1-2 design partners (target: BlackRock BUIDL, Franklin Templeton OnChain)
- Validate integrations and ROI metrics
- Iterate based on partner feedback

### Phase 3: Expansion & Refinement (Months 13-18)

#### Geographic Expansion: EU Market
- **MiCA Compliance Engine**
  - CASP licensing requirements
  - Passporting logic implementation
  - EU-specific reporting requirements
- **Data Localization**
  - EU data residency
  - GDPR-specific features

#### New Asset Classes
- **Tokenized Private Credit**
  - Loan origination compliance
  - Investor suitability checks
  - Payment waterfall validation
- **Real Estate Tokens**
  - Property rights verification
  - Cross-border ownership rules
  - Tax reporting automation

#### Advanced AI Capabilities
- **Predictive Compliance**
  - Forecast non-compliance risks
  - Recommend preventive actions
  - Scenario analysis tools
- **Risk Benchmarking**
  - Industry comparison dashboards
  - Performance metrics
  - Best practice recommendations

### Phase 4: Network Effect & Scale (Months 19-24)

#### Commercial Launch
- Convert pilot customers to paying contracts
- Broader custodian integrations
- Exchange partnerships

#### Geographic Expansion: APAC
- Singapore MAS compliance
- Hong Kong SFC requirements
- Japan FSA integration

#### Network Effects Strategy
- Become the universal compliance checkpoint
- Cross-platform compliance verification
- Industry standard for tokenized asset compliance

#### Extended Services
- Analytics dashboards
- Risk benchmarking tools
- Cross-market compliance reports
- Regulatory advisory services

#### Series A Preparation
- Case studies from pilot programs
- Regulatory endorsements
- Revenue traction metrics
- Strategic investor engagement

---

## 4) Technical Architecture

### Core Services Architecture

#### ai-broker (Current)
- Language: TypeScript (ESM); Framework: Express
- Endpoints: `GET /` (health), `POST /suggest` ({ prompt, maxTokens? })
- Status: Deployed to Cloud Run
- Exposure: Private-only by org policy

#### Data Normalization Service (Phase 1)
- Real-time streaming pipeline
- Batch processing for historical data
- Schema registry for data governance
- Event-driven architecture

#### Compliance Engine (Phase 1)
- Rules-based processing engine
- ML model serving infrastructure
- Decision audit service
- Regulatory mapping database

#### Integration Gateway (Phase 2)
- Partner API orchestration
- Rate limiting and retry logic
- Circuit breaker patterns
- API versioning strategy

### Infrastructure & DevOps

#### Current State
- Runtime: Google Cloud Run (containers)
- Build: pnpm workspaces; Docker linux/amd64
- Registry: Artifact Registry
- CI/CD: GitHub Actions with OIDC/WIF
- Secrets: Google Secret Manager
- Observability: Cloud Logging

#### Future Enhancements (Phase 1-2)
- Multi-region deployment
- Database: Cloud SQL/Spanner for transactional data
- BigQuery for analytics
- Pub/Sub for event streaming
- Cloud Functions for event processors

---

## 5) Risks & Dependencies

### Critical Risks

#### XAI Trust
- **Risk:** Adoption depends on clear, auditable AI decisions
- **Mitigation:**
  - Start with rules-based systems
  - Extensive documentation of decision logic
  - Regular third-party audits
  - Regulatory sandbox participation

#### Data Quality
- **Risk:** Poor ingestion/normalization undermines all compliance checks
- **Mitigation:**
  - Comprehensive data validation
  - Multiple source verification
  - Data quality monitoring dashboard
  - SLAs with data providers

#### Regulatory Agility
- **Risk:** Constant regulatory updates require rapid adaptation
- **Mitigation:**
  - NLP-driven monitoring from Day 1
  - Expert advisory board
  - Regulatory relationship management
  - Modular rules engine architecture

### Key Dependencies

#### Technical Dependencies
- Partner API availability and stability
- Cloud infrastructure reliability
- Third-party data provider accuracy

#### Market Dependencies
- RWA tokenization adoption rate
- Regulatory clarity evolution
- Partner willingness to integrate

#### Organizational Dependencies
- Hiring key technical talent
- Securing pilot customers
- Raising sufficient funding

---

## 6) Success Metrics

### Phase 1 (Months 1-6)
- Data sources integrated: 5+
- XAI decision accuracy: >95%
- Regulatory updates processed: Real-time
- Team size: 5-7 key hires

### Phase 2 (Months 7-12)
- Pilot partners secured: 2
- API response time: <100ms p99
- Compliance checks processed: 10K+/day
- Partner integrations live: 4

### Phase 3 (Months 13-18)
- Paying customers: 5+
- Asset classes supported: 3
- Jurisdictions covered: 3
- Monthly recurring revenue: $50K+

### Phase 4 (Months 19-24)
- Customers: 20+
- Compliance checks: 100K+/day
- ARR: $2M+
- Series A raised: $10-15M

---

## 7) Current Implementation Details

### Environments & Access
- Project: **veria-dev**; Region: **us-central1**
- Cloud Run service name: **ai-broker**
- Runtime SA: default unless specified in workflow
- Access: **Private-only** — unauthenticated access prohibited by org policy

### CI/CD (GitHub OIDC/WIF)
- WIF Pool: `github-pool` (ACTIVE)
- WIF Provider: `github-provider` (ACTIVE)
- Provider Condition:
  `attribute.repository == "PROACTIVA-US/Veria"` AND
  `attribute.ref.startsWith("refs/heads/main") OR attribute.ref.startsWith("refs/tags/")`
- CI Service Account: `veria-automation@veria-dev.iam.gserviceaccount.com`
- Required GH Secrets: `GCP_PROJECT_ID`, `GCP_SA_EMAIL`, `WORKLOAD_IDENTITY_PROVIDER`
- Workflow: `.github/workflows/cd.yml`

### Build & Deploy
- Target: linux/amd64
- Container: service Dockerfiles
- Registry: Artifact Registry
- Deploy: Cloud Run **by digest**; **--no-allow-unauthenticated**
- Min instances: 0 (scale-to-zero)

### Security
- No service account keys; **OIDC/WIF only**
- Private-only access; grant `roles/run.invoker` only to required principals
- Least privilege for CI SA

---

## 8) Partner Integration Specifications

### Fireblocks Integration
- **Purpose:** Institutional-grade custody and transaction management
- **Integration Points:**
  - Wallet creation and management APIs
  - Transaction signing workflows
  - Balance and transaction queries
  - Webhook notifications
- **Authentication:** API key + RSA signature
- **Priority:** Phase 2 - Critical for MVP

### Securitize Integration
- **Purpose:** Tokenization platform for securities
- **Integration Points:**
  - Token issuance APIs
  - Investor registry management
  - Corporate actions processing
  - Compliance rule configuration
- **Authentication:** OAuth 2.0
- **Priority:** Phase 2 - Critical for MVP

### Plaid Integration
- **Purpose:** Bank account and identity verification
- **Integration Points:**
  - Account verification
  - Balance checks
  - Identity verification
  - Transaction history
- **Authentication:** Client ID + Secret
- **Priority:** Phase 2 - Required for KYC/AML

### Chainalysis/Elliptic Integration
- **Purpose:** On-chain analytics and risk scoring
- **Integration Points:**
  - Wallet screening APIs
  - Transaction monitoring
  - Risk scoring endpoints
  - Sanctions screening
- **Authentication:** API key
- **Priority:** Phase 2 - Required for AML

---

## 9) Regulatory Coverage Matrix

### Phase 2: United States
- **Securities Regulations:** SEC Rules, Reg D, Reg S, Reg A+
- **AML/KYC:** BSA, USA PATRIOT Act, FinCEN requirements
- **Accreditation:** Rule 501 of Regulation D
- **State Laws:** Blue Sky laws for each state

### Phase 3: European Union (MiCA)
- **MiCA Requirements:** CASP licensing, passporting
- **GDPR:** Data protection and privacy
- **AML:** 5th and 6th AML Directives
- **MiFID II:** Investor protection rules

### Phase 4: Asia-Pacific
- **Singapore:** MAS Payment Services Act, Securities and Futures Act
- **Hong Kong:** SFC licensing requirements
- **Japan:** FSA regulations, Payment Services Act

---

## 10) Acceptance Criteria for Blitzy

### Immediate Actions
1. Build and deploy current ai-broker service
2. Validate OIDC/WIF authentication flow
3. Confirm private-only access enforcement

### Phase 1 Deliverables
1. Data normalization service scaffold
2. XAI framework implementation
3. NLP regulatory monitor prototype
4. Integration test harness

### Success Metrics
- All services deploy via digest
- Authentication works end-to-end
- Logs visible in Cloud Logging
- Rollback procedures tested

---

## 11) Runbook (Operations)

### Deployment
1. Trigger CD: merge to `main` or tag `vX.Y.Z`
2. Verify deployment:
   ```bash
   gcloud run services describe ai-broker --region=us-central1
   ```

### Monitoring
1. Check service health:
   ```bash
   SERVICE=ai-broker
   REGION=us-central1
   URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')
   IDT=$(gcloud auth print-identity-token --audiences="$URL")
   curl -H "Authorization: Bearer $IDT" "$URL"/
   ```

### Rollback
```bash
gcloud run services update-traffic ai-broker \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

---

## Appendix A: Technical Debt & Migration Plan

### Current Technical Debt
- Single service architecture (ai-broker only)
- Limited observability tooling
- No database layer yet
- Manual deployment processes

### Migration Strategy
1. Maintain backward compatibility
2. Incremental service extraction
3. Database migration with zero downtime
4. Progressive observability enhancement

---

## Appendix B: Competitive Analysis

### Direct Competitors
- **Compliance Solutions:** Chainalysis KYT, Elliptic Navigator
- **Tokenization Platforms:** Securitize (has compliance), Polymath
- **RegTech:** ComplyAdvantage, Trulioo

### Competitive Advantages
1. **Explainable AI:** Unique focus on decision transparency
2. **Multi-Platform:** Works across all tokenization platforms
3. **Partnership Strategy:** Integrate rather than compete
4. **Regulatory Expertise:** Deep regulatory change management

---

**END OF SPECIFICATION**

This document represents the authoritative Veria technical specification and roadmap. All development efforts should align with the priorities and phases outlined herein.