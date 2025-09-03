
# Product Spec — AI-Native Distribution & Compliance Middleware (v3)

## Problem
Distribution of tokenized RWAs is bottlenecked by fragmented compliance, jurisdictional constraints, and manual reviews.

## Solution
An **AI-native middleware** that sits between issuers/platforms and end-clients, performing:
- Real-time policy decisions (allow/deny/route)
- Risk scoring and explainability
- Audit logging with deterministic redaction
- Data lineage & provenance
- Auto-updating policy packs per jurisdiction

## Architecture (High Level)
- Edge Proxy (auth, throttling, request signing)
- Compliance API (FastAPI)
- Policy Engine & Feature Flags
- Vector store (Qdrant) for policy/RAG
- Redis for queues and rate limiting
- MCP servers + claudeflow flows for research, synthesis, and release ops

## Roadmap (Milestones)
- M0: v3 skeleton, local dev (this bundle)
- M1: Policy pack loader + unit tests
- M2: Lineage + audit log backends
- M3: Risk scoring plugins (KYT/KYB/KYC integrations)
- M4: Multi-jurisdiction policy sets
- M5: Production readiness (observability, SLOs, docs)

