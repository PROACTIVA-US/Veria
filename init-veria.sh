#!/bin/bash

# Veria Project Initialization Script
# Complete setup with DevAssist, session management, and documentation

PROJECT_ROOT="/Users/danielconnolly/Projects/Veria"
PROJECT_NAME="Veria"

echo "🚀 Initializing $PROJECT_NAME with DevAssist..."

# Create directory structure
echo "📁 Setting up directory structure..."
mkdir -p "$PROJECT_ROOT/.devassist/"{data,docs,knowledge,terminal_logs,scripts,sessions,agents}
mkdir -p "$PROJECT_ROOT/.claude/commands"
mkdir -p "$PROJECT_ROOT/.sessions"
mkdir -p "$PROJECT_ROOT/docs/daily"
mkdir -p "$PROJECT_ROOT/packages/blockchain/"{contracts,scripts,test}
mkdir -p "$PROJECT_ROOT/packages/database/"{migrations,seeds,models}

# Initialize SQLite database for DevAssist
echo "🗄️ Initializing DevAssist database..."
sqlite3 "$PROJECT_ROOT/.devassist/data/devassist.db" <<EOF
CREATE TABLE IF NOT EXISTS project_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    embedding BLOB
);

CREATE TABLE IF NOT EXISTS code_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL,
    file_path TEXT NOT NULL,
    language TEXT,
    context TEXT,
    frequency INTEGER DEFAULT 1,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    summary TEXT,
    checkpoints TEXT,
    status TEXT DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_memory_project ON project_memory(project);
CREATE INDEX IF NOT EXISTS idx_memory_category ON project_memory(category);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
EOF

# Create DevAssist configuration
echo "⚙️ Configuring DevAssist..."
cat > "$PROJECT_ROOT/.devassist/config.json" <<EOF
{
  "project": "$PROJECT_NAME",
  "version": "2.0.0",
  "features": {
    "session_management": true,
    "terminal_logging": true,
    "knowledge_base": true,
    "code_analysis": true,
    "warmup_enabled": true,
    "blockchain_integration": true,
    "rwa_tokenization": true
  },
  "paths": {
    "data": ".devassist/data",
    "docs": ".devassist/docs",
    "knowledge": ".devassist/knowledge",
    "logs": ".devassist/terminal_logs"
  },
  "blockchain": {
    "networks": ["ethereum", "polygon", "solana"],
    "features": ["rwa", "treasury", "defi", "compliance"]
  }
}
EOF

# Update session manager script
echo "📝 Creating session manager..."
cat > "$PROJECT_ROOT/.devassist/scripts/session-manager.sh" <<'EOF'
#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SESSION_DIR="$PROJECT_ROOT/.devassist/sessions"
LOG_DIR="$PROJECT_ROOT/.devassist/terminal_logs"
SESSION_ID="session_$(date +%Y%m%d_%H%M%S)"

start_session() {
    echo "🚀 Starting DevAssist session: $SESSION_ID"
    
    # Create session directory
    mkdir -p "$SESSION_DIR/$SESSION_ID"
    
    # Start terminal logging
    if command -v script >/dev/null 2>&1; then
        LOG_FILE="$LOG_DIR/${SESSION_ID}.log"
        echo "📝 Terminal logging to: $LOG_FILE"
        script -q "$LOG_FILE"
    fi
    
    # Record session start
    echo "{\"id\": \"$SESSION_ID\", \"start\": \"$(date -Iseconds)\", \"status\": \"active\"}" > "$SESSION_DIR/$SESSION_ID/metadata.json"
    
    # Verify DevAssist is running
    if pgrep -f "devassist.*$PROJECT_ROOT" >/dev/null; then
        echo "✅ DevAssist MCP server is running"
    else
        echo "⚠️ DevAssist MCP server not detected. Please restart Claude Code."
    fi
    
    echo "✨ Session started successfully!"
}

end_session() {
    echo "🏁 Ending DevAssist session..."
    
    # Find active session
    ACTIVE_SESSION=$(find "$SESSION_DIR" -name "metadata.json" -exec grep -l '"status": "active"' {} \; | head -1)
    
    if [ -n "$ACTIVE_SESSION" ]; then
        SESSION_PATH=$(dirname "$ACTIVE_SESSION")
        
        # Update session metadata
        jq '.status = "completed" | .end = "'$(date -Iseconds)'"' "$ACTIVE_SESSION" > "$ACTIVE_SESSION.tmp" && mv "$ACTIVE_SESSION.tmp" "$ACTIVE_SESSION"
        
        # Generate summary
        echo "📊 Generating session summary..."
        echo "Session completed at $(date)" > "$SESSION_PATH/summary.md"
        
        echo "✅ Session ended successfully"
    else
        echo "⚠️ No active session found"
    fi
}

status() {
    echo "📊 DevAssist Status"
    echo "=================="
    
    # Check MCP server
    if pgrep -f "devassist.*$PROJECT_ROOT" >/dev/null; then
        echo "✅ MCP Server: Running"
    else
        echo "❌ MCP Server: Not running"
    fi
    
    # Check active sessions
    ACTIVE=$(find "$SESSION_DIR" -name "metadata.json" -exec grep -l '"status": "active"' {} \; 2>/dev/null | wc -l)
    echo "📝 Active Sessions: $ACTIVE"
    
    # Check terminal logging
    if pgrep -f "script.*$LOG_DIR" >/dev/null; then
        echo "✅ Terminal Logging: Active"
    else
        echo "⚠️ Terminal Logging: Inactive"
    fi
}

case "$1" in
    start) start_session ;;
    end) end_session ;;
    status) status ;;
    *) echo "Usage: $0 {start|end|status}" ;;
esac
EOF
chmod +x "$PROJECT_ROOT/.devassist/scripts/session-manager.sh"

# Create Claude commands
echo "🤖 Setting up Claude commands..."

# Session start command
cat > "$PROJECT_ROOT/.claude/commands/session-start.md" <<'EOF'
---
type: shell
command: .devassist/scripts/session-manager.sh start
---

# /session-start

Starts a new DevAssist session with:
- Terminal logging
- Knowledge base activation
- Progress tracking
- DevAssist verification
EOF

# Session end command  
cat > "$PROJECT_ROOT/.claude/commands/session-end.md" <<'EOF'
---
type: shell
command: .devassist/scripts/session-manager.sh end
---

# /session-end

Ends the current session with:
- Knowledge review
- Summary generation
- Log preservation
EOF

# Session status command
cat > "$PROJECT_ROOT/.claude/commands/session-status.md" <<'EOF'
---
type: shell
command: .devassist/scripts/session-manager.sh status
---

# /session-status

Shows current session and DevAssist status
EOF

# Blockchain integration command
cat > "$PROJECT_ROOT/.claude/commands/blockchain-integration.md" <<'EOF'
---
type: claude
---

# /blockchain-integration

Sets up blockchain integration for Veria:
- Smart contract templates for RWA tokenization
- Treasury management contracts
- Compliance framework integration
- Multi-chain deployment scripts
EOF

# RWA feature command
cat > "$PROJECT_ROOT/.claude/commands/rwa-feature.md" <<'EOF'
---
type: claude
---

# /rwa-feature

Implements Real World Asset tokenization:
- Asset tokenization contracts
- Compliance checks (KYC/AML)
- Treasury integration
- Money market protocols
EOF

# Sprint status command
cat > "$PROJECT_ROOT/.claude/commands/sprint-status.md" <<'EOF'
---
type: claude
---

# /sprint-status

Shows current sprint progress and tasks
EOF

# Deploy production command
cat > "$PROJECT_ROOT/.claude/commands/deploy-production.md" <<'EOF'
---
type: claude
---

# /deploy-production

Deploys Veria to production:
- Security audit checks
- Compliance verification
- Multi-chain deployment
- Monitoring setup
EOF

# Create initial documentation
echo "📚 Creating documentation templates..."

cat > "$PROJECT_ROOT/docs/README.md" <<'EOF'
# Veria - Tokenized Real World Assets Platform

## Overview
Veria is a comprehensive platform for tokenizing and managing real world assets (RWA) with built-in compliance, treasury management, and multi-chain support.

## Features
- 🏦 Treasury Management
- 📊 Real World Asset Tokenization
- 🔐 KYC/AML Compliance
- ⛓️ Multi-chain Support (Ethereum, Polygon, Solana)
- 💰 Money Market Integration
- 📈 DeFi Protocols

## Quick Start
```bash
# Install dependencies
npm install

# Start DevAssist session
./devassist/scripts/session-manager.sh start

# Run development server
npm run dev
```

## Documentation
- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Technical Roadmap](./TECHNICAL_ROADMAP.md)
- [Product Specification](./PRODUCT_SPEC.md)

## Development with DevAssist
This project uses DevAssist for intelligent development assistance.

### Session Commands
- `/session-start` - Start development session
- `/session-status` - Check current status
- `/session-end` - End session with review
- `/blockchain-integration` - Set up blockchain features
- `/rwa-feature` - Implement RWA tokenization
EOF

cat > "$PROJECT_ROOT/docs/ARCHITECTURE.md" <<'EOF'
# Veria Architecture

## System Overview
Veria is built as a modular, microservices-based architecture designed for scalability and compliance.

## Core Components

### 1. Blockchain Layer
- Smart contracts for asset tokenization
- Treasury management contracts
- Compliance verification contracts
- Multi-chain abstraction layer

### 2. Compliance Engine
- KYC/AML verification
- Regulatory reporting
- Transaction monitoring
- Risk assessment

### 3. Treasury Management
- Asset custody
- Liquidity management
- Yield optimization
- Money market integration

### 4. API Gateway
- RESTful APIs
- GraphQL endpoints
- WebSocket connections
- Rate limiting & auth

## Technology Stack
- **Blockchain**: Ethereum, Polygon, Solana
- **Smart Contracts**: Solidity, Rust (Solana)
- **Backend**: Node.js, Python
- **Database**: PostgreSQL, Redis
- **Infrastructure**: Kubernetes, Docker

## Security Architecture
- Multi-sig wallets
- Hardware security modules
- Encrypted data storage
- Audit logging
EOF

cat > "$PROJECT_ROOT/docs/API.md" <<'EOF'
# Veria API Documentation

## Authentication
All API requests require authentication via JWT tokens.

## Endpoints

### Asset Management
- `POST /api/assets/tokenize` - Tokenize a real world asset
- `GET /api/assets/{id}` - Get asset details
- `PUT /api/assets/{id}` - Update asset metadata

### Treasury Operations
- `POST /api/treasury/deposit` - Deposit funds
- `POST /api/treasury/withdraw` - Withdraw funds
- `GET /api/treasury/balance` - Get treasury balance

### Compliance
- `POST /api/compliance/kyc` - Submit KYC information
- `GET /api/compliance/status/{userId}` - Check compliance status
- `POST /api/compliance/verify` - Verify transaction compliance

### DeFi Integration
- `POST /api/defi/stake` - Stake tokens
- `POST /api/defi/provide-liquidity` - Provide liquidity
- `GET /api/defi/yields` - Get current yields
EOF

# Update CLAUDE.md with comprehensive project info
echo "📋 Updating CLAUDE.md..."
cat > "$PROJECT_ROOT/CLAUDE.md" <<'EOF'
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
EOF

# Create sprint tracking file
cat > "$PROJECT_ROOT/SPRINT_BLOCKCHAIN_INTEGRATION.md" <<'EOF'
# Sprint: Blockchain Integration

## Sprint Goal
Implement core blockchain infrastructure for RWA tokenization platform.

## Tasks

### Smart Contracts
- [ ] Asset tokenization contract (ERC-1155)
- [ ] Treasury management contract
- [ ] Compliance verification contract
- [ ] Multi-sig wallet implementation

### Infrastructure
- [ ] Hardhat setup and configuration
- [ ] Multi-chain deployment scripts
- [ ] Contract verification scripts
- [ ] Gas optimization

### Testing
- [ ] Unit tests for all contracts
- [ ] Integration tests
- [ ] Security audit preparation
- [ ] Testnet deployment

### Documentation
- [ ] Contract documentation
- [ ] Deployment guide
- [ ] API integration guide
EOF

echo "✅ Initialization complete!"
echo ""
echo "📊 Summary:"
echo "  • DevAssist MCP configured"
echo "  • Session management installed"
echo "  • Documentation created"
echo "  • Blockchain structure ready"
echo "  • Sprint tracking active"
echo ""
echo "🎯 Next Steps:"
echo "  1. Restart Claude Code to activate DevAssist"
echo "  2. Run /session-start to begin"
echo "  3. Check /sprint-status for tasks"
echo "  4. Use /blockchain-integration for setup"
echo ""
echo "🚀 Ready to build Veria!"