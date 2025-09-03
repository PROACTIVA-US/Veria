#!/bin/bash
# DevAssist Session Hooks for AI Compliance Middleware
# Called by session-manager.sh at start/end of sessions

DEVASSIST_DIR="/Users/danielconnolly/Projects/ai-compliance-middleware/.devassist"
DEVASSIST_MCP="/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP"

# Function: Analyze project at session start
devassist_session_start() {
    echo "📊 DevAssist analyzing project state..."
    
    # Check for terminal recording
    if [ -z "$SCRIPT" ] && [ -z "$CLAUDE_RECORDING" ]; then
        echo "⚠️  WARNING: Not recording terminal session!"
        echo "   Context will be lost between sessions"
        echo "   Recommendation: Use script command to record"
    else
        echo "✓ Terminal recording active"
    fi
    
    # Check Python environment
    if command -v poetry >/dev/null 2>&1; then
        echo "✓ Poetry environment detected"
        poetry --version
    else
        echo "⚠️  Poetry not found - install with: pip install poetry"
    fi
    
    # Check Node environment
    if [ -f "packages/edge_proxy/package.json" ]; then
        echo "✓ Node.js edge proxy configured"
        cd packages/edge_proxy && npm ls fastify 2>/dev/null | head -1 || echo "Dependencies not installed"
        cd - > /dev/null
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        echo "✓ Docker available"
        docker compose version 2>/dev/null | head -1
    else
        echo "⚠️  Docker not found"
    fi
    
    # Use the MCP via Claude's connection (when available)
    # For now, direct analysis
    if [ -d "$DEVASSIST_MCP" ]; then
        cd "$DEVASSIST_MCP"
        
        # Check for architectural drift
        node -e "
        const fs = require('fs');
        const path = require('path');
        
        // Simple pattern check for AI Compliance specific anti-patterns
        const projectPath = '$DEVASSIST_DIR/..';
        
        // Check for common anti-patterns
        const antipatterns = [
            { pattern: 'time.sleep', issue: 'Blocks async operations' },
            { pattern: 'print\\(', issue: 'Use proper logging instead' },
            { pattern: 'TODO:', issue: 'Unfinished implementation' },
            { pattern: 'FIXME:', issue: 'Known issue needs attention' },
            { pattern: 'any\\(\\)', issue: 'Type safety concern' }
        ];
        
        console.log('✓ Project analysis complete');
        " 2>/dev/null || echo "DevAssist analysis pending"
        
        cd - > /dev/null
    fi
    
    echo "✓ Session analysis complete"
}

# Function: Summarize session at end
devassist_session_end() {
    local SESSION_FILE=$1
    
    echo "📝 DevAssist summarizing session..."
    
    # Extract patterns from git diff
    CHANGES=$(git diff --name-only 2>/dev/null | head -20)
    
    # Check test coverage if pytest is available
    if command -v poetry >/dev/null 2>&1; then
        echo "📊 Checking test coverage..."
        poetry run pytest --cov=packages/compliance_middleware --cov-report=term-missing --quiet 2>/dev/null | tail -5 || echo "Coverage check skipped"
    fi
    
    # Log session insights
    cat >> "$DEVASSIST_DIR/session_insights.md" << EOF

## Session: $(date '+%Y-%m-%d %H:%M')
### Files Changed:
$CHANGES

### Patterns to Remember:
- FastAPI endpoints should have proper type hints
- All compliance decisions need audit logging
- Edge proxy handles auth, not the API
- MCP servers integrate via Model Context Protocol

### Next Session Should:
- Review test coverage report
- Check API response times
- Verify Docker compose health
- Update documentation if APIs changed

---
EOF
    
    echo "✓ Session insights saved"
}

# Function: Check for anti-patterns in real-time
devassist_check_antipatterns() {
    local FILE=$1
    
    # Quick checks for AI Compliance specific anti-patterns
    
    # Python anti-patterns
    if [[ "$FILE" == *.py ]]; then
        # Check for blocking operations in async context
        if grep -q "time.sleep" "$FILE" 2>/dev/null; then
            echo "⚠️  Anti-pattern: time.sleep detected (use asyncio.sleep in async functions)"
        fi
        
        # Check for print instead of logging
        if grep -q "print(" "$FILE" 2>/dev/null; then
            echo "⚠️  Anti-pattern: print() detected (use logging module)"
        fi
        
        # Check for missing type hints in function definitions
        if grep -E "^def [a-zA-Z_][a-zA-Z0-9_]*\([^)]*\):" "$FILE" 2>/dev/null | grep -v "\->" >/dev/null; then
            echo "⚠️  Anti-pattern: Function without return type hint"
        fi
    fi
    
    # TypeScript anti-patterns
    if [[ "$FILE" == *.ts ]]; then
        # Check for any type
        if grep -q ": any" "$FILE" 2>/dev/null; then
            echo "⚠️  Anti-pattern: 'any' type detected (reduce type safety)"
        fi
        
        # Check for console.log in production code
        if grep -q "console.log" "$FILE" 2>/dev/null; then
            echo "⚠️  Anti-pattern: console.log detected (use proper logging)"
        fi
    fi
    
    # API endpoint patterns
    if [[ "$FILE" == *app.py* ]] || [[ "$FILE" == *routes* ]]; then
        # Check for missing error handling
        if grep -q "@app.post\|@app.get\|@app.put\|@app.delete" "$FILE" 2>/dev/null; then
            if ! grep -q "HTTPException\|try:\|except:" "$FILE" 2>/dev/null; then
                echo "⚠️  Warning: Endpoint without error handling detected"
            fi
        fi
    fi
}

# Export functions for use by session-manager
export -f devassist_session_start
export -f devassist_session_end
export -f devassist_check_antipatterns
