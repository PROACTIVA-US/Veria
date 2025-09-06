# Project: Veria - Real World Asset Tokenization Platform

## Overview
Veria is a comprehensive platform for tokenizing and managing real world assets with enterprise-grade compliance, treasury management, and multi-chain blockchain integration.

## Project Vision
Transform traditional assets into liquid, programmable digital tokens while maintaining regulatory compliance and institutional-grade security.

## Core Features
- 🏦 **Treasury Management**: Institutional-grade asset custody and management
- 📊 **RWA Tokenization**: Convert real world assets to blockchain tokens
- 🔐 **Compliance Engine**: Built-in KYC/AML and regulatory reporting
- ⛓️ **Multi-chain Support**: Deploy across Ethereum, Polygon, and Solana
- 💰 **DeFi Integration**: Connect to money markets and yield protocols
- 📈 **Analytics Dashboard**: Real-time insights and reporting

## Technology Stack
- **Blockchain**: Ethereum, Polygon, Solana
- **Smart Contracts**: Solidity, Rust
- **Backend**: Node.js, Python (compliance engine)
- **Frontend**: React, TypeScript
- **Database**: PostgreSQL, Redis
- **Infrastructure**: Docker, Kubernetes, Dagger

## DevAssist Integration
This project uses DevAssist MCP for intelligent development assistance.

### Session Management
- `/session-start` - Begin with DevAssist verification & logging
- `/session-status` - Check current state
- `/session-end` - End with knowledge review

### Specialized Commands
- `/blockchain-integration` - Set up blockchain features
- `/rwa-feature` - Implement RWA tokenization
- `/deploy-production` - Production deployment

### Terminal Logging
All sessions are automatically recorded to `.devassist/terminal_logs/`

### Knowledge Base
- Project documentation in `.devassist/docs/`
- Code patterns in `.devassist/knowledge/`
- Isolated from other projects

## Current Sprint: Blockchain Integration
Focus on implementing core blockchain infrastructure for RWA tokenization.

### Priority Tasks
1. Smart contract development for asset tokenization
2. Treasury management system
3. Compliance engine integration
4. Multi-chain deployment scripts
5. Testing and security audits

## Development Guidelines

### Starting Work
1. Run `/session-start` to begin
2. Check `/sprint-status` for current tasks
3. Use specialized agents for blockchain and RWA features
4. Run `/session-end` to save progress

### Code Standards
- Solidity: Follow OpenZeppelin standards
- TypeScript: Use strict mode
- Python: Follow PEP 8
- Testing: Minimum 80% coverage

### Security Requirements
- All smart contracts must be audited
- Multi-sig required for treasury operations
- KYC/AML checks for all users
- Encrypted storage for sensitive data

## Project Status
- **Phase**: Development
- **Sprint**: Blockchain Integration
- **DevAssist**: Configured with warmup & agents
- **Ready for**: Smart contract development

## Quick Commands
```bash
# Start session
/session-start

# Check sprint tasks
/sprint-status

# Set up blockchain
/blockchain-integration

# Implement RWA features
/rwa-feature

# Deploy to production
/deploy-production
```

## Contact & Support
- DevAssist: Active with specialized agents
- Documentation: `/docs` directory
- Session logs: `.devassist/terminal_logs/`

---
*This project uses DevAssist for intelligent development assistance. All data is isolated to this project.*
