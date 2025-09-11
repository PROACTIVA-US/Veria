# Veria System Architecture

**Version**: 2.0  
**Date**: January 2025  
**Status**: Living Document

## System Overview

Veria is built as a microservices-based architecture designed for scalability, security, and regulatory compliance. The platform uses a combination of Node.js (Fastify) services for high-performance API handling and Python (FastAPI) services for complex business logic and AI/ML operations.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   External Clients                       │
│  (Web Apps, Mobile Apps, Partner APIs, Admin Portal)     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS/WSS
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│                  (AWS ALB / Cloudflare)                  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   API Gateway Layer                      │
│                  (Port 3001 - Fastify)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • Authentication  • Rate Limiting  • Routing     │   │
│  │ • Request ID      • CORS          • Validation  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Tool Masker Layer                        │
│              (API Abstraction Service)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • Role-based Access  • Template Engine          │   │
│  │ • Input Validation   • Output Transformation    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Core Services Layer                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Identity   │  │   Policy     │  │  Compliance   │ │
│  │   Service    │  │   Service    │  │   Service     │ │
│  │  (Port 3002) │  │  (Port 3003) │  │  (Port 3004)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Audit     │  │  Treasury    │  │  Analytics    │ │
│  │   Service    │  │   Service    │  │   Service     │ │
│  │  (Port 3005) │  │  (Port 3006) │  │  (Port 3007)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Blockchain Layer                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Ethereum   │  │   Polygon    │  │   Solana     │ │
│  │   Connector  │  │   Connector  │  │  Connector   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Smart Contracts (ERC-3643, ERC-4337)            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    Data Layer                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │    Redis     │  │   Qdrant     │ │
│  │   (Primary)  │  │   (Cache)    │  │  (Vectors)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │      S3      │  │   InfluxDB   │  │ Elasticsearch│ │
│  │   (Files)    │  │  (Metrics)   │  │   (Logs)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Component Details

### 1. API Gateway (Port 3001)
**Technology**: Node.js with Fastify  
**Responsibilities**:
- Request routing to appropriate services
- JWT token validation
- Rate limiting and throttling
- Request/Response transformation
- Circuit breaking and retry logic

**Key Features**:
- Automatic service discovery
- Health check monitoring
- Request ID propagation
- CORS handling
- API versioning

### 2. Tool Masker Service
**Technology**: Node.js with YAML configuration  
**Purpose**: Abstract complex APIs behind simple, role-based tools

**Components**:
- **Mask Loader**: Loads and validates YAML definitions
- **Template Engine**: Jinja2-style templating
- **Role Manager**: Enforces access control
- **Mock Handler**: Development/testing support

**Available Masks**:
1. `compliance_kyc` - KYC validation
2. `treasury_yield` - Treasury rate data
3. `order_subscribe_mmfs` - Fund subscriptions
4. `sec_recent_10k` - SEC filings
5. `distribution_onboard_client` - Client onboarding
6. `kyc_validate` - Enhanced KYC with regions
7. `finance_treasury_yield` - Financial data

### 3. Identity Service (Port 3002)
**Technology**: TypeScript with Fastify  
**Status**: 30% Complete - Needs Enhancement

**Responsibilities**:
- User authentication (JWT)
- WebAuthn/Passkey support
- Session management
- Role-based access control
- Multi-factor authentication

**Database Tables**:
- `users` - User accounts
- `sessions` - Active sessions
- `credentials` - Authentication methods
- `roles` - Role definitions
- `permissions` - Permission mapping

### 4. Policy Service (Port 3003)
**Technology**: TypeScript with Fastify  
**Status**: 40% Complete - Needs DB Integration

**Responsibilities**:
- Policy definition and storage
- Rule evaluation engine
- Compliance rule management
- Policy versioning
- Audit trail of changes

**Policy Structure**:
```yaml
version: "1.0"
metadata:
  name: "US Accredited Investor Policy"
  jurisdiction: ["US"]
requirements:
  kyc_level: "enhanced"
  accreditation: required
  sanctions: "none"
limits:
  min_investment: 10000
  max_investment: 1000000
```

### 5. Compliance Service (Port 3004)
**Technology**: TypeScript with Fastify  
**Status**: 0% Complete - CRITICAL - Not Implemented

**Planned Features**:
- Real-time compliance decisions
- KYC/AML orchestration
- Sanctions screening
- Transaction monitoring
- Regulatory reporting

**Integration Points**:
- Chainalysis API
- TRM Labs API
- OFAC sanctions list
- Internal policy engine

### 6. Audit Service (Port 3005)
**Technology**: TypeScript with Fastify  
**Status**: 35% Complete - Missing Read Endpoints

**Responsibilities**:
- Immutable audit logging
- Event streaming
- Compliance reporting
- Activity tracking
- Forensic analysis support

**Storage Strategy**:
- Write to PostgreSQL for persistence
- Stream to Elasticsearch for search
- Archive to S3 for long-term storage

### 7. Treasury Service (Port 3006)
**Technology**: Python with FastAPI  
**Status**: Not Started

**Planned Features**:
- Portfolio management
- Yield optimization
- Risk analytics
- Automated rebalancing
- Tax optimization

### 8. Analytics Service (Port 3007)
**Technology**: Python with FastAPI  
**Status**: Not Started

**Planned Features**:
- Real-time metrics
- Custom dashboards
- Predictive analytics
- Anomaly detection
- Report generation

## Data Architecture

### Primary Database (PostgreSQL)
**Purpose**: Transactional data and system of record

**Schema Overview**:
- **Organizations**: Companies, institutions
- **Users**: Individual user accounts
- **Policies**: Compliance and business rules
- **Transactions**: Token transfers and trades
- **Audit_logs**: Immutable activity records

### Cache Layer (Redis)
**Purpose**: Session management and performance optimization

**Use Cases**:
- JWT token blacklist
- User sessions
- API rate limiting
- Cached policy rules
- Real-time metrics

### Vector Database (Qdrant)
**Purpose**: AI/ML features and semantic search

**Use Cases**:
- Document embedding
- Similarity search
- Recommendation engine
- Fraud detection patterns

## Security Architecture

### Authentication Flow
```
Client → Gateway → Identity Service → JWT Generation
Client → Gateway (JWT in header) → Service Authorization
```

### Authorization Model
- **RBAC**: Role-based access control
- **ABAC**: Attribute-based for fine-grained control
- **Policy-based**: Compliance rules enforcement

### Security Layers
1. **Network Security**
   - VPC isolation
   - Security groups
   - WAF rules
   - DDoS protection

2. **Application Security**
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CSRF tokens

3. **Data Security**
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - Key rotation
   - PII tokenization

4. **Blockchain Security**
   - Multi-signature wallets
   - Time-locked transactions
   - Audit trail on-chain
   - Smart contract audits

## Deployment Architecture

### Development Environment
```yaml
Infrastructure:
  - Docker Compose for local services
  - LocalStack for AWS services
  - Ganache for blockchain testing
```

### Staging Environment
```yaml
Infrastructure:
  - Kubernetes cluster (EKS)
  - RDS PostgreSQL
  - ElastiCache Redis
  - Polygon Mumbai testnet
```

### Production Environment
```yaml
Infrastructure:
  - Multi-region Kubernetes (EKS)
  - Aurora PostgreSQL (Multi-AZ)
  - ElastiCache Redis (Cluster mode)
  - Polygon Mainnet
  - CloudFront CDN
  - Route53 DNS
```

## Communication Patterns

### Synchronous Communication
- REST APIs for CRUD operations
- GraphQL for complex queries
- gRPC for service-to-service

### Asynchronous Communication
- Redis Streams for events
- WebSockets for real-time updates
- Message queues for background jobs

### Event-Driven Architecture
```
Service A → Event → Message Bus → Service B, C, D
```

**Key Events**:
- UserRegistered
- PolicyUpdated
- ComplianceCheckCompleted
- TransactionProcessed
- AuditLogCreated

## Scalability Strategy

### Horizontal Scaling
- Stateless services
- Load balancer distribution
- Auto-scaling groups
- Container orchestration

### Vertical Scaling
- Database read replicas
- Caching layers
- Query optimization
- Index strategies

### Performance Targets
- API Response: < 200ms (p99)
- Throughput: 10,000 TPS
- Availability: 99.99% uptime
- RTO: < 1 hour
- RPO: < 1 minute

## Monitoring & Observability

### Metrics (Prometheus)
- Service health
- API latency
- Error rates
- Business metrics

### Logging (ELK Stack)
- Centralized logging
- Structured logs
- Log aggregation
- Search and analysis

### Tracing (Jaeger)
- Distributed tracing
- Request flow visualization
- Performance bottlenecks
- Error tracking

### Alerting
- PagerDuty integration
- Slack notifications
- Email alerts
- Custom webhooks

## Disaster Recovery

### Backup Strategy
- Database: Daily snapshots, point-in-time recovery
- Files: S3 versioning and replication
- Code: Git repositories with mirrors
- Configs: Encrypted in parameter store

### Recovery Procedures
1. **Service Failure**: Auto-restart, circuit breaker
2. **Database Failure**: Failover to replica
3. **Region Failure**: Multi-region failover
4. **Data Corruption**: Restore from backup

## Technology Stack Summary

### Backend
- **Node.js**: Fastify for high-performance APIs
- **Python**: FastAPI for complex business logic
- **TypeScript**: Type safety across services

### Frontend
- **Next.js 14**: Server-side rendering
- **React 18**: Component architecture
- **TailwindCSS**: Utility-first styling

### Infrastructure
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **Terraform**: Infrastructure as code
- **GitHub Actions**: CI/CD

### Blockchain
- **Ethers.js**: Ethereum interaction
- **Viem**: Type-safe blockchain
- **Hardhat**: Smart contract development

### Databases
- **PostgreSQL**: Primary database
- **Redis**: Caching and sessions
- **Qdrant**: Vector database

### Monitoring
- **Prometheus**: Metrics
- **Grafana**: Dashboards
- **Elasticsearch**: Log storage
- **Jaeger**: Distributed tracing

## API Standards

### RESTful Conventions
```
GET    /api/v1/resources      # List
POST   /api/v1/resources      # Create
GET    /api/v1/resources/:id  # Read
PUT    /api/v1/resources/:id  # Update
DELETE /api/v1/resources/:id  # Delete
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "request_id": "uuid"
  },
  "errors": []
}
```

### Error Handling
```json
{
  "success": false,
  "errors": [{
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "field": "email"
  }]
}
```

## Development Workflow

### Git Flow
```
main → develop → feature/xyz
     ↘ hotfix/abc ↗
```

### Code Review Process
1. Create feature branch
2. Implement changes
3. Write tests
4. Create pull request
5. Code review
6. Merge to develop

### Deployment Pipeline
```
Code → Build → Test → Security Scan → Deploy → Monitor
```

---

*This architecture document represents the target state. Current implementation is approximately 15% complete. See STATUS.md for current state.*

**Last Updated**: January 2025  
**Next Review**: After Sprint 1 completion