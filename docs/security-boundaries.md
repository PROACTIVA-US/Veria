# Veria Platform Security Boundaries

## Executive Summary

This document defines the comprehensive security boundaries for the Veria platform, establishing clear separation between runtime and CI/CD service accounts, documenting authentication mechanisms, authorization boundaries, and compliance controls. The platform implements a zero-trust security model with multi-layer defense-in-depth architecture, keyless authentication through GitHub OIDC/Workload Identity Federation, and comprehensive audit controls meeting SEC, FINRA, and SOX regulatory requirements.

**Key Security Principles:**
- **Principle of Least Privilege**: All service accounts operate with minimal required permissions
- **Keyless Authentication**: GitHub OIDC/WIF eliminates long-lived service account keys
- **Private-Only Access**: All Cloud Run services require ID-token authentication
- **Immutable Deployments**: Container images deployed exclusively by digest reference
- **Zero Trust Network**: All communications authenticated and authorized
- **Audit Completeness**: 7-year retention with immutable compliance evidence

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Authorization and Access Control](#authorization-and-access-control)
3. [Service Account Security Boundaries](#service-account-security-boundaries)
4. [CI/CD Security Model](#cicd-security-model)
5. [Data Protection and Privacy](#data-protection-and-privacy)
6. [Compliance Framework](#compliance-framework)
7. [Supply Chain Security](#supply-chain-security)
8. [Network Security Boundaries](#network-security-boundaries)
9. [Monitoring and Incident Response](#monitoring-and-incident-response)
10. [Appendices](#appendices)

---

## Authentication Architecture

### Multi-Factor Authentication Framework

The Veria platform implements a sophisticated multi-factor authentication system supporting both modern passwordless authentication and traditional credential-based methods, ensuring compliance with regulatory requirements while providing optimal user experience.

#### WebAuthn/FIDO2 Implementation

**Technology Stack:**
- **Library**: `@simplewebauthn/server` for FIDO2-compliant authentication
- **Biometric Support**: Fingerprint, facial recognition, and voice authentication
- **Hardware Tokens**: YubiKey, Google Titan, and other FIDO2 security keys
- **Anti-Phishing Protection**: Cryptographic domain binding prevents credential reuse attacks

**Security Benefits:**
- **Phishing Resistant**: Cryptographic challenge-response prevents credential theft
- **Device-Bound**: Private keys stored in secure hardware (TPM/Secure Enclave)
- **Regulatory Compliance**: Meets NIST 800-63B AAL3 requirements
- **User Experience**: Single-touch authentication without passwords

#### Traditional Authentication Security

**Password Policy Enforcement:**
```regex
Password Requirements: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
```

**Security Controls:**
- **Minimum Length**: 8 characters with complexity requirements
- **Hashing Algorithm**: bcrypt with 10 salt rounds (OWASP recommended)
- **Weak Password Detection**: Proactive blocking of common passwords
- **Account Lockout**: Progressive delays after failed attempts
- **Secure Generation**: Cryptographically random password generation

### JWT Token Management

#### Token Architecture

**Signing Algorithms:**
- **Development Environment**: HS256 with environment-variable secrets
- **Production Environment**: RS256 with Google Secret Manager key management
- **Migration Path**: Planned transition from HS256 to RS256 for enhanced security

**Token Types and Lifecycles:**

| Token Type | Algorithm | TTL Duration | Rotation Policy | Storage Location |
|------------|-----------|--------------|-----------------|------------------|
| Access Token | HS256/RS256 | 15 minutes | Automatic via refresh | Client memory only |
| Refresh Token | HS256 (separate secret) | 7 days | Manual/automatic rotation | HTTP-only secure cookies |
| Session Token | HS256 with session data | 7 days | Tied to session lifecycle | Redis with TTL |
| API Token | HS256 for external APIs | Configurable | Manual rotation | Database with revocation |

**Token Claims Structure:**
```json
{
  "userId": "uuid",
  "email": "user@domain.com",
  "roles": ["INVESTOR", "VIEWER"],
  "organizationId": "uuid",
  "sessionId": "uuid",
  "iat": 1640995200,
  "exp": 1640996100,
  "aud": "veria-api",
  "iss": "veria-identity"
}
```

#### Key Management Security

**Production Key Management:**
- **Storage**: Google Secret Manager with automatic rotation capability
- **Access Control**: Service-specific IAM roles limiting key access
- **Audit Trail**: Complete key usage logging and access monitoring
- **Disaster Recovery**: Cross-region key backup with encrypted storage

**Key Rotation Strategy:**
- **Frequency**: Monthly automated rotation for signing keys
- **Process**: Zero-downtime rotation with overlapping key validity
- **Validation**: Automated testing ensures successful key transitions
- **Rollback**: Immediate fallback capability for failed rotations

### Session Management Architecture

#### Redis-Backed Session Storage

**Session Storage Strategy:**
```mermaid
graph TD
    A[User Authentication] --> B[Session Creation]
    B --> C[Redis Primary Storage<br/>7-day TTL]
    B --> D[PostgreSQL Audit Record<br/>Permanent Retention]
    
    C --> E[Session Metadata<br/>IP, User-Agent, Timestamp]
    D --> F[Compliance Audit Trail<br/>Session Events, Security Context]
    
    E --> G[Active Session Monitoring]
    F --> H[Regulatory Reporting]
    
    G --> I[Multi-Device Support<br/>Concurrent Sessions]
    H --> J[7-Year Retention Policy<br/>SEC/FINRA Compliance]
```

**Session Security Features:**
- **Correlation Tracking**: Unique X-Request-ID for distributed tracing
- **IP Address Validation**: Session binding with geolocation monitoring
- **User Agent Fingerprinting**: Device identification and anomaly detection
- **Concurrent Session Management**: Per-user session limits with selective invalidation
- **Automatic Cleanup**: Redis TTL ensures expired session removal

#### Session Invalidation Mechanisms

**Immediate Revocation Capabilities:**
- **User-Initiated**: Manual logout from single device or all devices
- **Security-Driven**: Automatic invalidation on suspicious activity
- **Administrative**: Compliance officer session termination authority
- **Policy-Based**: Automated invalidation based on risk scoring
- **Emergency Response**: Instant platform-wide session revocation capability

---

## Authorization and Access Control

### Role-Based Access Control (RBAC) Matrix

The platform implements a comprehensive RBAC system with seven distinct user roles and granular permission assignments across eight functional categories, ensuring precise access control aligned with regulatory requirements and business functions.

#### Role Hierarchy and Permissions

| Role | User Management | Organization | Policy Management | Compliance | KYC/AML | Transactions | Audit | System |
|------|----------------|--------------|-------------------|------------|---------|--------------|-------|---------|
| **SUPER_ADMIN** | Full Access | Full Access | Full Access | Full Access | Full Access | Full Access | Full Access | Full Access |
| **ADMIN** | CRUD Operations | CRUD Operations | CRUD Operations | Read Only | Read Only | Read/Approve | Read/Export | Limited Config |
| **COMPLIANCE_OFFICER** | Read Only | Read Only | Read Only | Review/Approve/Reject/Override | Review/Approve/Reject/Update | Read Only | Read/Export | No Access |
| **INVESTOR** | Own Profile Only | Own Org Read | No Access | No Access | Own Records Only | Own Transactions Only | Own Activity Only | No Access |
| **INSTITUTION** | Member Mgmt | Own Org CRUD | No Access | Submit Only | Bulk Upload | Institution Txns | Org Activity | No Access |
| **ISSUER** | Own Team Mgmt | Own Org CRUD | Create/Submit | Submit Only | Basic Verification | Issue/Redeem | Own Activity | No Access |
| **VIEWER** | No Access | Read Only | No Access | No Access | No Access | Read Only | No Access | No Access |

#### Permission Categories Detail

**User Management Permissions:**
- `user:create` - Create new user accounts
- `user:read` - View user profiles and information
- `user:update` - Modify user profiles and settings
- `user:delete` - Deactivate or remove user accounts
- `user:impersonate` - Administrative user impersonation (SUPER_ADMIN only)

**Compliance Permissions:**
- `compliance:review` - Review KYC/AML submissions
- `compliance:approve` - Approve compliance verifications
- `compliance:reject` - Reject non-compliant submissions
- `compliance:override` - Override automated compliance decisions
- `compliance:audit` - Access compliance audit trails

### Permission Enforcement Architecture

#### Middleware-Driven Authorization

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant Gateway as API Gateway
    participant Auth as Auth Middleware
    participant Redis as Permission Cache
    participant DB as PostgreSQL
    participant Service as Backend Service
    
    Client->>Gateway: API Request + JWT
    Gateway->>Auth: Token Validation
    Auth->>Auth: Extract User Context
    
    Auth->>Redis: Check Permission Cache
    alt Cache Hit
        Redis->>Auth: Cached Permissions
    else Cache Miss
        Auth->>DB: Query User Roles & Permissions
        DB->>Auth: Permission Set
        Auth->>Redis: Cache Permissions (300s TTL)
    end
    
    Auth->>Auth: Evaluate Required Permission
    
    alt Authorized
        Auth->>Service: Forward Request + User Context
        Service->>Service: Resource-Level Authorization
        Service->>Client: Response
    else Unauthorized
        Auth->>Client: 403 Forbidden + Error Context
    end
```

**Permission Middleware Features:**
- **Real-Time Evaluation**: Permission checks on every request
- **Context Awareness**: Organizational and resource-scoped permissions
- **Performance Optimization**: Redis caching with 5-minute TTL
- **Audit Integration**: Complete permission check logging
- **Error Context**: Detailed authorization failure information

#### Row-Level Security (RLS) Implementation

**Database-Level Access Control:**
The platform implements comprehensive RLS policies ensuring automatic data filtering based on organizational context and user permissions.

**RLS Policy Examples:**
```sql
-- User Profile Access Policy
CREATE POLICY user_profile_access ON users
  USING (organization_id = current_setting('app.current_organization_id')::uuid
         AND (user_id = current_setting('app.current_user_id')::uuid
              OR current_user_has_permission('user:read')));

-- Compliance Data Access Policy  
CREATE POLICY compliance_data_access ON compliance_verifications
  USING (organization_id = current_setting('app.current_organization_id')::uuid
         AND (subject_user_id = current_setting('app.current_user_id')::uuid
              OR current_user_has_permission('compliance:review')));

-- Audit Log Access Policy
CREATE POLICY audit_log_access ON audit_logs
  USING (organization_id = current_setting('app.current_organization_id')::uuid
         AND current_user_has_permission('audit:read'));
```

**RLS Security Benefits:**
- **Transparent Filtering**: Automatic data access restrictions
- **Defense in Depth**: Database-level security as final enforcement point
- **Query Optimization**: Index-optimized filtering for performance
- **Compliance Assurance**: Automatic regulatory data isolation

---

## Service Account Security Boundaries

### Runtime Service Account Architecture

The platform maintains strict separation between runtime service accounts and CI/CD service accounts, implementing the principle of least privilege with role-specific permission assignments.

#### Runtime Service Accounts

**veria-investor@ Service Account:**
- **Purpose**: Dedicated to investor portal runtime operations
- **Scope**: Production investor-facing services only
- **Permissions**: 
  - `roles/run.serviceAgent` - Cloud Run service execution
  - `roles/secretmanager.secretAccessor` - Environment-specific secrets
  - `roles/cloudsql.client` - Database connection (if applicable)
- **Access Pattern**: Internal service-to-service communication only
- **Network Security**: Private VPC access with no external endpoints

**veria-automation@ Service Account (Runtime):**
- **Purpose**: Backend service automation and internal operations
- **Scope**: Internal service orchestration and data processing
- **Permissions**:
  - `roles/run.serviceAgent` - Service execution capabilities
  - `roles/secretmanager.secretAccessor` - Configuration secrets
  - `roles/pubsub.editor` - Internal event processing
  - `roles/storage.objectViewer` - Read-only access to static assets
- **Security Boundary**: Isolated from CI/CD operations

#### CI/CD Service Account Architecture

**veria-automation@veria-dev.iam.gserviceaccount.com (CI/CD):**
- **Purpose**: GitHub Actions CI/CD pipeline operations
- **Authentication**: GitHub OIDC/Workload Identity Federation only
- **Permissions**:
  - `roles/run.admin` - Deploy and manage Cloud Run services
  - `roles/iam.serviceAccountUser` - Impersonate runtime service accounts
  - `roles/artifactregistry.writer` - Container image publishing
  - `roles/cloudbuild.builds.editor` - Build process management (if needed)
- **Access Restrictions**:
  - Repository scope: `PROACTIVA-US/Veria` only
  - Branch conditions: `refs/heads/main` and `refs/tags/*` only
  - No JSON key authentication permitted

### Service Account Permission Boundaries

#### Principle of Least Privilege Implementation

**Permission Segregation Matrix:**

| Permission Category | Runtime Accounts | CI/CD Account | Business Justification |
|-------------------|------------------|---------------|-------------------------|
| **Cloud Run Management** | Service Agent Only | Admin Access | Runtime executes; CI/CD deploys |
| **Secret Access** | Environment-Specific | None | Runtime needs config; CI/CD uses WIF |
| **Database Access** | Connection Only | None | Runtime processes data; CI/CD doesn't |
| **Artifact Registry** | None | Write Access | Runtime uses images; CI/CD publishes |
| **Service Account Impersonation** | None | Limited to Runtime SAs | CI/CD deploys as runtime accounts |

**Permission Validation:**
```bash
# Verify CI/CD service account permissions
gcloud projects get-iam-policy veria-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:veria-automation@veria-dev.iam.gserviceaccount.com"

# Expected roles:
# - roles/run.admin
# - roles/iam.serviceAccountUser  
# - roles/artifactregistry.writer
```

#### Cross-Account Access Controls

**Impersonation Security Model:**
The CI/CD service account can impersonate runtime service accounts during deployment but cannot:
- Access runtime service account keys
- Modify runtime service account permissions
- Access runtime secrets outside deployment context
- Execute operations outside GitHub Actions environment

**Audit Trail Requirements:**
All service account impersonation activities generate comprehensive audit logs including:
- Source identity (GitHub workflow context)
- Target service account
- Operations performed
- Time stamps and correlation IDs
- Success/failure status

---

## CI/CD Security Model

### GitHub OIDC/Workload Identity Federation

The platform implements keyless authentication through GitHub's OIDC provider integrated with Google Cloud's Workload Identity Federation, completely eliminating long-lived service account keys from the CI/CD pipeline.

#### Workload Identity Federation Architecture

**WIF Configuration:**
```yaml
# Workload Identity Pool Configuration
Pool ID: projects/190356591245/locations/global/workloadIdentityPools/github-pool
Provider: projects/190356591245/locations/global/workloadIdentityPools/github-pool/providers/github-provider

# OIDC Provider Configuration
Issuer: https://token.actions.githubusercontent.com
Audience: https://github.com/PROACTIVA-US

# Attribute Mappings
google.subject: assertion.sub
attribute.repository: assertion.repository
attribute.ref: assertion.ref
attribute.actor: assertion.actor
attribute.workflow_ref: assertion.workflow_ref
attribute.aud: assertion.aud
```

**Security Boundary Conditions:**
```javascript
// WIF Provider Condition (Development)
attribute.repository=="PROACTIVA-US/Veria" && 
(attribute.ref.startsWith("refs/heads/main") || attribute.ref.startsWith("refs/tags/"))

// WIF Provider Condition (Staging - Future)  
attribute.repository=="PROACTIVA-US/Veria" && 
attribute.ref.startsWith("refs/heads/staging")
```

#### Authentication Flow Security

```mermaid
sequenceDiagram
    participant GHA as GitHub Actions
    participant OIDC as GitHub OIDC Provider
    participant STS as Google STS
    participant WIF as Workload Identity Federation
    participant SA as Service Account
    participant GCP as GCP Services
    
    GHA->>OIDC: Request ID Token
    OIDC->>GHA: JWT Token with Claims
    
    GHA->>STS: Exchange JWT for Access Token
    STS->>WIF: Validate Token & Conditions
    WIF->>WIF: Verify Repository & Branch
    WIF->>SA: Generate Impersonation Token
    SA->>GHA: Short-lived Access Token (1 hour)
    
    GHA->>GCP: API Calls with Access Token
    GCP->>GHA: Service Responses
    
    Note over GHA,GCP: No long-lived keys stored or transmitted
    Note over WIF,SA: Automatic token expiration (1 hour max)
```

**Security Advantages:**
- **No Stored Secrets**: Eliminates secret management complexity
- **Short-Lived Tokens**: Maximum 1-hour token lifetime
- **Cryptographic Verification**: JWT signature validation
- **Conditional Access**: Repository and branch-specific access control
- **Audit Transparency**: Complete authentication event logging
- **Revocation Capability**: Immediate access revocation through WIF configuration

### Immutable Deployment Security

#### Image Digest Deployment Strategy

**Immutable Deployment Rule:**
All production deployments MUST use image digest references and NEVER tag-based references. This immutable deployment requirement ensures:

- **Deployment Traceability**: Exact image content verification
- **Rollback Precision**: Exact version restoration capability  
- **Supply Chain Integrity**: Prevents image substitution attacks
- **Compliance Evidence**: Immutable deployment artifact records

**Deployment Command Pattern:**
```bash
# REQUIRED: Deploy by digest
gcloud run deploy $SERVICE_NAME \
  --image us-central1-docker.pkg.dev/veria-dev/veria/$SERVICE_NAME@sha256:$IMAGE_DIGEST \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated

# PROHIBITED: Deploy by tag
gcloud run deploy $SERVICE_NAME \
  --image us-central1-docker.pkg.dev/veria-dev/veria/$SERVICE_NAME:latest  # NEVER
```

#### Container Image Security

**Artifact Registry Security Controls:**
- **Registry Location**: `us-central1-docker.pkg.dev/veria-dev/veria`
- **Access Control**: IAM-based repository access with role-based permissions
- **Vulnerability Scanning**: Automatic scanning on image push with SARIF reporting
- **Retention Policy**: 10 latest tagged digests retained, 30-day untagged cleanup
- **Binary Authorization**: Future planned implementation for deployment gates

**Image Build Security:**
```yaml
# Secure build process in GitHub Actions
- name: Build Container Image
  run: |
    docker build \
      --tag $IMAGE_NAME \
      --build-arg BUILDKIT_INLINE_CACHE=1 \
      --cache-from $IMAGE_NAME:cache \
      .

- name: Generate SBOM
  run: |
    trivy sbom --format spdx-json --output sbom.spdx.json $IMAGE_NAME

- name: Vulnerability Scan
  run: |
    trivy image --format sarif --output trivy-results.sarif $IMAGE_NAME

- name: Push with Digest
  run: |
    docker push $IMAGE_NAME
    IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' $IMAGE_NAME | cut -d@ -f2)
    echo "IMAGE_DIGEST=$IMAGE_DIGEST" >> $GITHUB_ENV
```

### Private-Only Access Model

#### Cloud Run Security Configuration

**Network Security Enforcement:**
All Cloud Run services operate in private-only mode requiring authenticated access through ID tokens, preventing unauthorized external access.

```yaml
# Cloud Run Service Configuration
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  annotations:
    run.googleapis.com/ingress: private  # No public access
    run.googleapis.com/vpc-access-connector: projects/veria-dev/locations/us-central1/connectors/default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/execution-environment: gen2
    spec:
      serviceAccountName: veria-investor@veria-dev.iam.gserviceaccount.com
      containerConcurrency: 80
```

**ID Token Authentication:**
Client access requires valid Google Cloud ID tokens with proper audience claims:

```bash
# Authenticated service access
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     -H "Content-Type: application/json" \
     https://veria-investor-dev-[hash]-uc.a.run.app/health

# Service-to-service authentication within VPC
curl -H "Authorization: Bearer $(curl -H "Metadata-Flavor: Google" \
     http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=https://target-service)" \
     https://target-service/api/endpoint
```

**Access Control Benefits:**
- **Zero Public Exposure**: No unauthenticated external access possible
- **Identity Verification**: All requests verified against Google identity
- **Audit Trail**: Complete access logging with caller identification
- **DDoS Protection**: Built-in Google Cloud DDoS mitigation
- **Traffic Analytics**: Detailed request monitoring and anomaly detection

---

## Data Protection and Privacy

### Encryption Implementation

#### Multi-Layer Encryption Strategy

**Transport Layer Security:**
- **TLS Version**: TLS 1.3 enforced for all HTTPS communications
- **Certificate Management**: Google-managed SSL certificates with automatic renewal
- **HSTS Policy**: Strict Transport Security prevents protocol downgrade attacks
- **Certificate Transparency**: Public certificate logging for enhanced security

**Data at Rest Encryption:**
- **Database Encryption**: PostgreSQL native encryption using cloud-managed keys
- **Secret Storage**: Google Secret Manager with envelope encryption
- **File Storage**: Cloud Storage with default Google-managed encryption
- **Key Management**: Customer-Managed Encryption Keys (CMEK) planned for sensitive data

**Application-Level Encryption:**
- **Password Storage**: bcrypt with 10 salt rounds (OWASP compliant)
- **JWT Signing**: HS256 (development) → RS256 (production) migration planned
- **Session Data**: Redis-stored sessions with logical encryption separation
- **PII Masking**: Field-level encryption for highly sensitive data (SSN, passport numbers)

#### Key Management Security

**Google Secret Manager Integration:**
```yaml
# Production key management pattern
- name: Access JWT Signing Key
  run: |
    JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-signing-key")
    echo "::add-mask::$JWT_SECRET"
    echo "JWT_SECRET=$JWT_SECRET" >> $GITHUB_ENV
```

**Key Rotation Schedule:**
- **JWT Signing Keys**: Monthly automated rotation (planned)
- **Database Credentials**: Quarterly coordinated rotation
- **External API Keys**: Provider-dependent rotation cycles
- **Session Encryption**: Weekly rotation with backward compatibility

### Privacy-by-Design Implementation

#### Data Classification and Handling

**Data Sensitivity Levels:**

| Classification | Examples | Protection Requirements | Access Controls |
|----------------|----------|-------------------------|-----------------|
| **Highly Sensitive** | SSN, Passport Numbers, Bank Accounts | Field-level encryption + access logging | C-level/Compliance officers only |
| **Sensitive** | Names, Addresses, Phone Numbers, Email | Standard database encryption + RLS | Role-based access with business need |
| **Internal** | User IDs, Session Data, System Logs | Standard security measures | Organization-scoped access |
| **Public** | Product Information, Public Policies | No special protection required | Public API access permitted |

#### Tool Masker Service Architecture

**Configuration-Driven Data Masking:**
The Tool Masker Service (port 4005) implements flexible data abstraction using YAML configuration and Handlebars templating:

```yaml
# Data masking configuration example
masking_rules:
  highly_sensitive:
    ssn: "XXX-XX-{last4}"
    passport: "{country}-XXXXXX"
    bank_account: "****{last4}"
  
  sensitive:
    full_name: "{first_initial}. {last_name}"
    email: "{first_char}***@{domain}"
    phone: "({area_code}) XXX-XXXX"
    
  format_preserving:
    credit_card: "XXXX-XXXX-XXXX-{last4}"
    routing_number: "XXXXX{last4}"
```

**Privacy Controls:**
- **Collection Limitation**: Only compliance-required data collected
- **Purpose Binding**: Data used exclusively for stated business purposes  
- **Retention Limitation**: Automatic deletion after regulatory retention periods
- **Accuracy Maintenance**: Regular data quality checks and correction procedures
- **Individual Access Rights**: User data access and correction capabilities

---

## Compliance Framework

### Regulatory Requirements Implementation

#### SEC Rule 31a-1 Compliance

**Investment Company Records Retention:**
- **Requirement**: 7-year retention for customer account records
- **Implementation**: PostgreSQL with time-based partitioning and audit-grade backup
- **Evidence**: Immutable audit logs with cryptographic integrity verification
- **Access Controls**: Compliance officer and audit-specific access roles

```sql
-- Customer record retention policy implementation
CREATE TABLE customer_records (
    customer_id UUID PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Partition by year for 7-year retention
    PARTITION BY RANGE (EXTRACT(YEAR FROM created_at))
);

-- Automatic partition management
CREATE TABLE customer_records_2024 PARTITION OF customer_records
    FOR VALUES FROM (2024) TO (2025);
```

#### FINRA Rule 4511 Compliance  

**Business Records Maintenance:**
- **Requirement**: Complete transaction and business records
- **Implementation**: Dual-write audit architecture with file system and database storage
- **Format**: JSONL for immutable file-based evidence, PostgreSQL for queryable analysis
- **Retention**: Permanent retention with automated backup verification

**Transaction Record Structure:**
```json
{
  "transaction_id": "uuid",
  "timestamp": "2024-12-15T10:30:00Z",
  "transaction_type": "TOKEN_TRANSFER",
  "participants": {
    "sender": "organization_id",
    "receiver": "organization_id"
  },
  "amount": {
    "value": "1000.00",
    "currency": "USD",
    "token_address": "0x..."
  },
  "compliance_status": "APPROVED",
  "audit_trail": [
    {
      "action": "INITIATED",
      "timestamp": "2024-12-15T10:29:45Z",
      "actor": "user_id",
      "ip_address": "192.168.1.100"
    }
  ]
}
```

#### SOX Section 802 Compliance

**Document Destruction and Audit Obstruction Prevention:**
- **Implementation**: Immutable append-only audit logs preventing tampering
- **Technology**: JSONL files with cryptographic hash verification
- **Access Controls**: No delete permissions for audit data
- **Backup Strategy**: Geographic distribution with integrity monitoring

**Audit Log Integrity Verification:**
```bash
# Audit log integrity check process
sha256sum /audit/logs/audit-2024-12-15.jsonl > /audit/checksums/2024-12-15.sha256
gpg --sign /audit/checksums/2024-12-15.sha256

# Verification process
gpg --verify /audit/checksums/2024-12-15.sha256.gpg
sha256sum -c /audit/checksums/2024-12-15.sha256
```

### Audit Infrastructure

#### Dual-Write Architecture

**Comprehensive Audit Capture:**
```mermaid
graph TD
    subgraph "Application Services"
        A[Identity Service] --> E[Audit Interface]
        B[Policy Service] --> E
        C[Compliance Service] --> E
        D[Gateway Service] --> E
    end
    
    subgraph "Dual-Write Audit System"
        E --> F[Synchronous File Write<br/>audit.jsonl - Immutable]
        E --> G[Asynchronous DB Write<br/>PostgreSQL - Queryable]
        
        F --> H[File System<br/>Permanent Retention<br/>Cryptographic Integrity]
        G --> I[Database<br/>Advanced Analytics<br/>Time-based Partitioning]
    end
    
    subgraph "Compliance Integration"
        H --> J[Regulatory Reporting<br/>SEC/FINRA/SOX Evidence]
        I --> K[Real-time Monitoring<br/>Anomaly Detection]
    end
```

**Audit Event Categories:**

| Event Category | Regulatory Basis | Retention Requirement | Audit Detail Level |
|----------------|------------------|----------------------|-------------------|
| **Authentication Events** | SOX Section 404 | Permanent | Full context + biometrics |
| **Data Access Operations** | GDPR Article 30 | 6 years minimum | Complete access patterns |
| **Financial Transactions** | SEC Rule 17a-4, FINRA Rule 4511 | Permanent | Immutable transaction records |
| **Administrative Actions** | SOX Section 302 | Permanent | Complete change audit trail |
| **Compliance Decisions** | Bank Secrecy Act | 7 years | Multi-provider verification records |

---

## Supply Chain Security

### Software Bill of Materials (SBOM) Generation

#### SPDX-Compliant SBOM Implementation

The CI pipeline automatically generates comprehensive Software Bill of Materials using Trivy scanner, providing complete transparency into software component dependencies for security analysis and compliance requirements.

**SBOM Generation Process:**
```yaml
# GitHub Actions SBOM generation
- name: Generate SBOM
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    format: 'spdx-json'
    output: 'sbom.spdx.json'
    
- name: Upload SBOM to Dependency Track
  run: |
    curl -X POST "$DEPENDENCY_TRACK_URL/api/v1/bom" \
      -H "X-API-Key: $DEPENDENCY_TRACK_API_KEY" \
      -H "Content-Type: application/json" \
      -d @sbom.spdx.json

- name: Archive SBOM for Compliance
  uses: actions/upload-artifact@v4
  with:
    name: sbom-spdx-${{ github.sha }}
    path: sbom.spdx.json
    retention-days: 2555  # 7 years for compliance
```

**SBOM Content Structure:**
```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "veria-platform-sbom",
  "documentNamespace": "https://github.com/PROACTIVA-US/Veria/sbom/2024-12-15",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-npm-express-4.18.2",
      "name": "express",
      "versionInfo": "4.18.2",
      "downloadLocation": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "filesAnalyzed": false,
      "licenseConcluded": "MIT",
      "copyrightText": "Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>"
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relationshipType": "DESCRIBES",
      "relatedSpdxElement": "SPDXRef-Application"
    }
  ]
}
```

### Vulnerability Scanning Integration

#### Multi-Stage Security Scanning

**Container Vulnerability Assessment:**
```mermaid
graph TD
    A[Code Commit] --> B[Dependency Audit<br/>pnpm audit]
    B --> C[Container Build<br/>Docker BuildKit]
    C --> D[SBOM Generation<br/>Trivy SPDX Output]
    D --> E[Vulnerability Scan<br/>Trivy SARIF Output]
    
    E --> F{Critical Vulnerabilities?}
    F -->|Yes| G[Build Failure<br/>Security Alert]
    F -->|No| H[Continue Pipeline<br/>Security Report]
    
    G --> I[GitHub Security Tab<br/>SARIF Integration]
    H --> I
    
    I --> J[Artifact Registry Push<br/>Signed Images]
    J --> K[Deployment Gate<br/>Security Validation]
```

**SARIF Report Integration:**
```yaml
# Vulnerability scanning with SARIF output
- name: Container Vulnerability Scan
  run: |
    trivy image --format sarif --output trivy-results.sarif $IMAGE_NAME
    
- name: Upload SARIF Results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
    
- name: Security Gate Check
  run: |
    CRITICAL_COUNT=$(jq '.runs[0].results | map(select(.level == "error")) | length' trivy-results.sarif)
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
      echo "Critical vulnerabilities detected: $CRITICAL_COUNT"
      exit 1
    fi
```

**Vulnerability Response Workflow:**
- **Critical Severity**: Immediate build failure and security team notification
- **High Severity**: Warning notification with 24-hour remediation requirement
- **Medium/Low Severity**: Tracked in security backlog with prioritized remediation
- **Zero-Day Vulnerabilities**: Emergency patch process with expedited approval

### Container Image Lifecycle Management

#### Artifact Registry Retention Policy

**Supply Chain Security Controls:**
The Artifact Registry implements comprehensive retention policies managed through Terraform ensuring container image lifecycle management while maintaining deployment artifacts for security analysis and regulatory compliance.

```hcl
# Terraform configuration for Artifact Registry retention
resource "google_artifact_registry_repository" "veria" {
  project       = var.project_id
  location      = var.region
  repository_id = "veria"
  format        = "DOCKER"
  
  cleanup_policies {
    id     = "keep-latest-tagged"
    action = "KEEP"
    
    condition {
      tag_state = "TAGGED"
    }
    
    most_recent_versions {
      keep_count = 10
    }
  }
  
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    
    condition {
      tag_state    = "UNTAGGED"
      older_than   = "2592000s"  # 30 days
    }
  }
}
```

**Retention Policy Benefits:**
- **Security Analysis**: Maintains tagged images for security research and incident response
- **Compliance Evidence**: Provides deployment artifact trail for auditing requirements
- **Storage Optimization**: Automatic cleanup prevents unbounded storage growth
- **Supply Chain Integrity**: Curated image lifecycle prevents unauthorized modifications

**Image Signing and Verification (Future):**
- **Cosign Integration**: Planned keyless container image signing
- **Binary Authorization**: Deployment gates based on signed image verification
- **Attestation Framework**: Complete build provenance and security attestations
- **Policy Enforcement**: Automated policy violations prevent insecure deployments

---

## Network Security Boundaries

### Private VPC Architecture

#### Network Isolation Strategy

The Veria platform implements comprehensive network security through private Virtual Private Cloud (VPC) architecture with strict ingress/egress controls and encrypted communications.

**Network Topology:**
```mermaid
graph TD
    subgraph "External Traffic"
        A[Client Applications] --> B[Google Cloud Load Balancer<br/>TLS Termination]
        C[GitHub Actions] --> D[Google APIs<br/>OAuth/OIDC Endpoint]
    end
    
    subgraph "VPC Network (us-central1)"
        B --> E[Cloud Run Services<br/>Private Ingress Only]
        D --> F[Workload Identity Federation<br/>Keyless Authentication]
        
        E --> G[VPC Connector<br/>Serverless Access]
        F --> E
        
        G --> H[Private Service Networking<br/>Cloud SQL/Redis]
        G --> I[NAT Gateway<br/>Controlled Egress]
    end
    
    subgraph "External Integrations"
        I --> J[KYC Provider APIs<br/>HTTPS + OAuth2]
        I --> K[Blockchain RPCs<br/>HTTPS + Rate Limiting]
        I --> L[Accounting APIs<br/>HTTPS + OAuth2]
    end
    
    style E fill:#ffcdd2
    style F fill:#c8e6c9
    style H fill:#e1f5fe
```

**Network Security Controls:**
- **Private Ingress**: Cloud Run services require ID-token authentication
- **VPC Connector**: Secure serverless-to-VPC communication  
- **Private Service Networking**: Database connections isolated within VPC
- **NAT Gateway**: Controlled outbound internet access with logging
- **Firewall Rules**: Explicit allow-list for required communications

#### Service Mesh Security

**Internal Communication Security:**
All service-to-service communication flows through the API Gateway (port 4000) implementing centralized security controls and distributed tracing.

**Gateway Security Features:**
```javascript
// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 60 * 1000,     // 1 minute window
  max: 100,                // Maximum 100 requests per IP per minute
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
};
```

### DDoS Protection and Rate Limiting

#### Multi-Layer DDoS Mitigation

**Google Cloud DDoS Protection:**
- **Network-Level**: Automatic DDoS detection and mitigation at Google edge
- **Application-Level**: Cloud Armor integration for sophisticated attack patterns
- **Rate Limiting**: Multiple tiers of rate limiting from edge to application
- **Geographic Filtering**: Country-based access controls for compliance requirements

**Application Rate Limiting Strategy:**

| Layer | Rate Limit | Purpose | Response |
|-------|------------|---------|----------|
| **Edge (Cloud CDN)** | 10,000 req/min per IP | Network-level protection | HTTP 429 with retry-after |
| **Load Balancer** | 1,000 req/min per IP | Service protection | Connection throttling |
| **API Gateway** | 100 req/min per IP | Application protection | JSON error response |
| **Service-Specific** | 50 req/min per user | User protection | Contextual error message |
| **Authentication** | 5 attempts per 5 min | Credential protection | Account lockout progression |

**Circuit Breaker Implementation:**
```javascript
// Circuit breaker configuration for external services
const circuitBreakerOptions = {
  timeout: 30000,        // 30 second timeout
  errorThresholdPercentage: 50,  // Trip at 50% error rate
  resetTimeout: 60000,   // 1 minute recovery period
  
  onOpen: () => {
    console.log('Circuit breaker opened - service unavailable');
    // Alert operations team
  },
  
  onHalfOpen: () => {
    console.log('Circuit breaker half-open - testing service recovery');
  },
  
  onClose: () => {
    console.log('Circuit breaker closed - service recovered');
  }
};
```

---

## Monitoring and Incident Response

### Security Event Monitoring

#### Real-Time Security Analytics

The platform implements comprehensive security monitoring through distributed logging, anomaly detection, and automated alerting systems providing proactive threat detection and rapid incident response capabilities.

**Security Event Categories:**

```mermaid
graph TD
    subgraph "Security Event Sources"
        A[Authentication Service<br/>Login attempts, MFA events] --> E[Security Event Aggregator]
        B[API Gateway<br/>Rate limiting, blocked requests] --> E
        C[Audit Service<br/>Admin actions, policy changes] --> E
        D[Application Services<br/>Authorization failures, anomalies] --> E
    end
    
    subgraph "Event Processing Pipeline"
        E --> F[Log Aggregation<br/>Structured JSON logging]
        F --> G[Anomaly Detection<br/>ML-based pattern analysis]
        G --> H[Risk Scoring<br/>Composite threat assessment]
        H --> I[Alert Generation<br/>Severity-based notifications]
    end
    
    subgraph "Response Mechanisms"
        I --> J[Immediate Response<br/>Account lockout, IP blocking]
        I --> K[Team Notifications<br/>Security team alerting]
        I --> L[Compliance Logging<br/>Regulatory event capture]
    end
```

**Monitoring Metrics and Thresholds:**

| Security Metric | Threshold | Alert Level | Automated Response |
|-----------------|-----------|-------------|-------------------|
| **Failed Login Attempts** | >5 per user per 5 min | WARNING | Progressive account lockout |
| **Geographic Anomalies** | Login from new country | INFO | Additional MFA requirement |
| **Permission Escalation** | Role change to admin level | HIGH | Immediate security team alert |
| **Data Export Volume** | >1000 records per hour | CRITICAL | Automatic export suspension |
| **API Rate Limit Hits** | >50% of limit reached | WARNING | Client notification, monitoring |

#### Anomaly Detection System

**Machine Learning-Enhanced Monitoring:**
```python
# Anomaly detection configuration
security_patterns = {
    'authentication_anomalies': {
        'unusual_login_times': {
            'algorithm': 'isolation_forest',
            'features': ['hour_of_day', 'day_of_week', 'user_id'],
            'anomaly_threshold': 0.1
        },
        'geographic_patterns': {
            'algorithm': 'dbscan',
            'features': ['ip_location', 'user_location', 'time_delta'],
            'distance_threshold': 1000  # km
        }
    },
    
    'data_access_patterns': {
        'bulk_data_access': {
            'algorithm': 'statistical_threshold',
            'baseline_period': '30_days',
            'threshold_multiplier': 3.0
        },
        'unusual_queries': {
            'algorithm': 'sequence_analysis',
            'pattern_detection': 'sql_injection_signatures'
        }
    }
}
```

### Incident Response Framework

#### Security Incident Classification

**Incident Severity Levels:**

| Severity | Definition | Response Time | Escalation | Example |
|----------|------------|---------------|------------|---------|
| **CRITICAL** | Immediate business impact/data breach | 15 minutes | C-level notification | Successful external attack |
| **HIGH** | Significant security risk | 1 hour | Security team lead | Failed admin privilege escalation |
| **MEDIUM** | Potential security concern | 4 hours | On-call engineer | Unusual access patterns detected |
| **LOW** | Information/monitoring alert | 24 hours | Standard ticket | Rate limit thresholds exceeded |

**Incident Response Playbooks:**

```yaml
# Security incident response workflow
incident_response:
  data_breach_suspected:
    immediate_actions:
      - "Isolate affected systems within 5 minutes"
      - "Preserve evidence through automated log collection"
      - "Notify legal and compliance teams"
      - "Activate crisis communication plan"
    
    investigation_steps:
      - "Forensic image creation of affected systems"
      - "Log analysis for attack vectors and timeline"
      - "User impact assessment and notification plan"
      - "Vulnerability assessment and remediation"
    
    recovery_procedures:
      - "System restoration from verified clean backups"
      - "Security control enhancement implementation"
      - "Continuous monitoring for related activities"
      - "Post-incident review and process improvement"

  authentication_compromise:
    immediate_actions:
      - "Force password reset for affected accounts"
      - "Revoke all active sessions"
      - "Enable additional MFA requirements"
      - "Block suspicious IP addresses"
```

#### Business Continuity and Disaster Recovery

**Recovery Time Objectives (RTO):**

| Service Category | RTO Target | RPO Target | Backup Strategy | Testing Frequency |
|------------------|------------|------------|------------------|-------------------|
| **Critical Services** (Gateway, Identity) | <15 minutes | <5 minutes | Real-time replication | Weekly |
| **Business Services** (Compliance, Policy) | <30 minutes | <15 minutes | Hourly snapshots | Monthly |
| **Support Services** (Audit, Tool Masker) | <60 minutes | <30 minutes | Daily backups | Quarterly |

**Disaster Recovery Security Considerations:**
- **Encrypted Backups**: All backup data encrypted in transit and at rest
- **Authenticated Recovery**: Multi-factor authentication required for recovery operations
- **Audit Trail**: Complete logging of all recovery activities and decisions
- **Security Validation**: Full security posture verification before service restoration
- **Compliance Continuity**: Regulatory reporting capabilities maintained throughout recovery

---

## Appendices

### Appendix A: Security Architecture Diagrams

#### Comprehensive Security Model Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Applications<br/>React/TypeScript] --> B[Authentication<br/>WebAuthn/JWT]
        C[Mobile Applications<br/>React Native] --> B
        D[API Clients<br/>Third-party integrations] --> B
    end
    
    subgraph "Network Security Layer"
        B --> E[Google Cloud Load Balancer<br/>TLS 1.3 + DDoS Protection]
        E --> F[API Gateway<br/>Rate Limiting + CORS]
    end
    
    subgraph "Application Security Layer"
        F --> G[Authentication Middleware<br/>JWT Validation + Session Management]
        G --> H[Authorization Middleware<br/>RBAC + Permission Validation]
        H --> I[Service Mesh<br/>Internal mTLS + Tracing]
    end
    
    subgraph "Service Layer"
        I --> J[Identity Service<br/>User Management + Auth]
        I --> K[Policy Service<br/>Business Rules + Compliance]
        I --> L[Compliance Service<br/>KYC/AML + Risk Assessment]
        I --> M[Audit Service<br/>Event Logging + Compliance]
        I --> N[Tool Masker<br/>Data Privacy + PII Protection]
    end
    
    subgraph "Data Security Layer"
        O[PostgreSQL<br/>Row-Level Security + Encryption] --> P[Backup Systems<br/>Encrypted + Geographic Distribution]
        Q[Redis<br/>Session Storage + TTL Management] --> R[Memory Protection<br/>Encryption + Access Controls]
        S[Secret Manager<br/>Key Management + Rotation] --> T[Audit Logging<br/>Access Tracking + Compliance]
    end
    
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O
    
    J --> Q
    G --> Q
    
    J --> S
    K --> S
    L --> S
```

### Appendix B: Compliance Mapping Matrix

#### Regulatory Requirement Coverage

| Compliance Framework | Requirement | Implementation | Evidence Location | Validation Method |
|---------------------|-------------|----------------|-------------------|-------------------|
| **SEC Rule 31a-1** | 7-year customer record retention | PostgreSQL partitioning + backup | Database audit logs | Automated retention verification |
| **FINRA Rule 4511** | Complete business records | Dual-write audit architecture | File system + database | Cryptographic integrity checking |
| **SOX Section 802** | Document destruction prevention | Immutable audit logs | Append-only JSONL files | Hash verification + digital signatures |
| **SOX Section 404** | Internal control assessment | Access control documentation | This security boundaries document | Annual security audit |
| **Bank Secrecy Act** | Customer identification program | Multi-provider KYC verification | Compliance verification records | Regulatory examinations |
| **PCI DSS** | Payment card security | TLS 1.3 + secure storage | TLS configuration + audit logs | Quarterly vulnerability scans |
| **GDPR Article 30** | Processing activity records | Complete audit trail | Activity log database | Data protection impact assessments |

### Appendix C: Emergency Procedures

#### Security Incident Emergency Contacts

**Incident Response Team:**
- **Security Lead**: [Primary contact for all security incidents]
- **Compliance Officer**: [Regulatory and legal consultation]  
- **Platform Engineer**: [Technical system response and recovery]
- **Legal Counsel**: [Regulatory notification and legal implications]
- **Communications Lead**: [Customer and stakeholder communications]

**Emergency Response Procedures:**
1. **Immediate Assessment** (0-15 minutes):
   - Determine incident severity and scope
   - Activate incident response team
   - Begin evidence preservation

2. **Containment** (15-60 minutes):
   - Isolate affected systems
   - Prevent further damage
   - Maintain service continuity for unaffected systems

3. **Investigation** (1-24 hours):
   - Forensic analysis of security event
   - Root cause determination
   - Impact assessment and user notification planning

4. **Recovery** (24-72 hours):
   - System restoration from verified clean state
   - Security enhancement implementation  
   - Continuous monitoring activation

5. **Post-Incident** (1-2 weeks):
   - Comprehensive incident report
   - Process improvement recommendations
   - Regulatory notification completion

### Appendix D: Security Configuration Reference

#### Required Environment Variables and Secrets

**Development Environment:**
```bash
# Authentication configuration
JWT_SECRET=development-key-change-in-production
JWT_REFRESH_SECRET=development-refresh-key
SESSION_SECRET=development-session-key

# Database configuration  
DATABASE_URL=postgresql://user:pass@localhost:5432/veria_dev
REDIS_URL=redis://localhost:6379

# External service configuration
CHAINALYSIS_API_KEY=dev-key
TRM_LABS_API_KEY=dev-key
JUMIO_API_KEY=dev-key
```

**Production Environment (Secret Manager):**
```yaml
# Google Secret Manager configuration
secrets:
  jwt-signing-key:
    description: "Production JWT signing key"
    rotation_period: "30d"
    
  jwt-refresh-key:
    description: "JWT refresh token key"
    rotation_period: "30d"
    
  database-url:
    description: "PostgreSQL connection string"
    rotation_period: "90d"
    
  redis-url:
    description: "Redis connection string"
    rotation_period: "90d"
```

#### Cloud Run Security Configuration

**Required Service Configuration:**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  annotations:
    # Security annotations
    run.googleapis.com/ingress: private
    run.googleapis.com/vpc-access-connector: projects/veria-dev/locations/us-central1/connectors/default
    run.googleapis.com/binary-authorization-breakglass: false
    
spec:
  template:
    metadata:
      annotations:
        # Runtime security
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/cpu-throttling: false
        
    spec:
      # Service account binding
      serviceAccountName: veria-[service]@veria-dev.iam.gserviceaccount.com
      
      # Resource limits
      containerConcurrency: 80
      timeoutSeconds: 300
      
      containers:
      - image: us-central1-docker.pkg.dev/veria-dev/veria/[service]@sha256:[digest]
        
        # Security context
        securityContext:
          runAsNonRoot: true
          readOnlyRootFilesystem: true
          
        # Resource constraints
        resources:
          limits:
            cpu: 1000m
            memory: 2Gi
          requests:
            cpu: 100m
            memory: 256Mi
            
        # Environment variables from secrets
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-signing-key
              key: latest
```

---

**Document Information:**
- **Version**: 1.0
- **Last Updated**: December 15, 2024
- **Document Owner**: Platform Security Team
- **Review Cycle**: Quarterly
- **Next Review Date**: March 15, 2025
- **Classification**: Internal Use - Security Sensitive
- **Retention Period**: 7 years (regulatory compliance)

**Related Documentation:**
- [GitHub OIDC Deployment Configuration](docs/deploy/oidc.md)
- [WIF Bootstrap Report](docs/reports/WIF_BOOTSTRAP_REPORT.md)
- [WIF Setup Issues](docs/reports/WIF_SETUP_ISSUE.md)
- [Veria Technical Specification v2](tech-specs/Veria-Tech-Spec-v2-Blitzy.md)

---

*This document contains confidential and proprietary information. Distribution is restricted to authorized personnel with legitimate business need for access to security architecture information.*