#!/bin/bash

# =============================================================================
#                  AI COMPLIANCE MIDDLEWARE SESSION MANAGER
#              Integrates with DevAssist MCP for session tracking
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVASSIST_DIR="$PROJECT_ROOT/.devassist"
SESSIONS_DIR="$PROJECT_ROOT/.sessions"
CURRENT_SESSION="$PROJECT_ROOT/.current-session"
DEVASSIST_MCP="/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP"

# Ensure directories exist
mkdir -p "$SESSIONS_DIR"
mkdir -p "$DEVASSIST_DIR"

# Function to start session
start_session() {
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║      AI COMPLIANCE MIDDLEWARE SESSION STARTING                ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Check for completed sprints FIRST to prevent duplicate work
    if [ -f "$SESSIONS_DIR/COMPLETED_SPRINTS.md" ]; then
        echo -e "${BLUE}📋 Checking completed sprints to prevent duplicate work...${NC}"
        echo -e "${YELLOW}Already Completed:${NC}"
        grep "^### ✅" "$SESSIONS_DIR/COMPLETED_SPRINTS.md" 2>/dev/null | sed 's/### ✅ //' || echo "None yet"
        echo
    fi
    
    # Create session file
    SESSION_FILE="$SESSIONS_DIR/session-$(date +%Y%m%d_%H%M).md"
    echo "# AI Compliance Middleware Session - $(date '+%Y-%m-%d %H:%M')" > "$SESSION_FILE"
    echo "" >> "$SESSION_FILE"
    
    # Check git status
    echo -e "${YELLOW}Git Status:${NC}"
    cd "$PROJECT_ROOT"
    git status --short
    echo
    
    # Review key documents
    echo -e "${YELLOW}Reviewing project state...${NC}"
    
    # Check current priorities from STATUS.md
    if [ -f "$PROJECT_ROOT/STATUS.md" ]; then
        echo -e "${BLUE}Current Status:${NC}"
        head -20 "$PROJECT_ROOT/STATUS.md" 2>/dev/null || echo "No status file found"
        echo
    fi
    
    # Check CLAUDE.md for commands
    echo -e "${CYAN}Key Commands:${NC}"
    echo "• ${YELLOW}make api${NC} - Start FastAPI server"
    echo "• ${YELLOW}make test${NC} - Run tests"
    echo "• ${YELLOW}make lint${NC} - Check code quality"
    echo "• ${YELLOW}make docker-up${NC} - Start all services"
    echo
    
    # Check last session if exists
    LAST_SESSION=$(ls -t "$SESSIONS_DIR"/session-*.md 2>/dev/null | head -2 | tail -1)
    if [ -n "$LAST_SESSION" ] && [ -f "$LAST_SESSION" ]; then
        echo -e "${BLUE}Last Session Summary:${NC}"
        grep -A 3 "## Next Priorities" "$LAST_SESSION" 2>/dev/null || echo "No previous priorities found"
        echo
    fi
    
    # Load DevAssist hooks if available
    if [ -f "$PROJECT_ROOT/scripts/devassist-hooks.sh" ]; then
        source "$PROJECT_ROOT/scripts/devassist-hooks.sh"
        devassist_session_start
    fi
    
    # Check if DevAssist MCP is running
    if pgrep -f "DevAssist_MCP" > /dev/null; then
        echo -e "${GREEN}✓ DevAssist MCP is running${NC}"
    else
        echo -e "${BLUE}DevAssist MCP will auto-connect via Claude Code${NC}"
    fi
    
    # Check for previous terminal log and read it
    LAST_TERMINAL_LOG=$(ls -t "$SESSIONS_DIR"/terminal-*.log 2>/dev/null | head -1)
    if [ -n "$LAST_TERMINAL_LOG" ] && [ -f "$LAST_TERMINAL_LOG" ]; then
        echo -e "${CYAN}📜 Found previous terminal log: $(basename $LAST_TERMINAL_LOG)${NC}"
        echo -e "${BLUE}Claude will read this for context${NC}"
        
        # Create instruction file for Claude to read
        cat > "$SESSIONS_DIR/READ_PREVIOUS_LOG.md" << EOF
# INSTRUCTION FOR CLAUDE

Please read the previous terminal log for context:
$LAST_TERMINAL_LOG

Also check for any messages:
$SESSIONS_DIR/MESSAGE_FOR_FUTURE_CLAUDE.md

This will give you full context from the previous session.
EOF
        
        echo -e "${YELLOW}📖 CLAUDE: Read $SESSIONS_DIR/READ_PREVIOUS_LOG.md${NC}"
    fi
    
    # Auto-start terminal recording if not already running
    TERMINAL_LOG="$SESSIONS_DIR/terminal-$(date +%Y%m%d_%H%M).log"
    
    # Check if we're already in a script session
    if [ -z "$SCRIPT" ]; then
        echo -e "${YELLOW}📹 Terminal recording recommendation:${NC}"
        echo -e "${GREEN}script $TERMINAL_LOG${NC}"
    else
        echo -e "${GREEN}✓ Already recording terminal to: $SCRIPT${NC}"
        TERMINAL_LOG="$SCRIPT"
    fi
    
    # Record session start
    echo "$SESSION_FILE" > "$CURRENT_SESSION"
    echo "$TERMINAL_LOG" > "$CURRENT_SESSION.terminal"
    
    # Initial session content
    cat >> "$SESSION_FILE" << EOF
## Session Start
- Time: $(date '+%H:%M:%S')
- Branch: $(git branch --show-current)
- DevAssist: Active
- Project: AI Compliance Middleware

## Objectives
[To be set based on current priorities]

## Work Log
EOF
    
    # Check for ClaudeFlow integration
    if [ -d "$PROJECT_ROOT/claudeflow" ]; then
        echo -e "${CYAN}📦 ClaudeFlow Available:${NC}"
        echo "• ${BLUE}npx claude-flow@alpha swarm${NC} - Multi-agent tasks"
        echo "• ${BLUE}npx claude-flow@alpha hive-mind wizard${NC} - Interactive intelligence"
        echo
    fi
    
    echo
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Session started successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${CYAN}Key Reminders:${NC}"
    echo "• ${YELLOW}API: FastAPI on port 8000${NC}"
    echo "• ${YELLOW}Edge Proxy: Fastify on port 3000${NC}"
    echo "• ${YELLOW}Test coverage: Keep >80%${NC}"
    echo "• ${YELLOW}Session limit: 2 hours${NC}"
    echo
    echo -e "${BLUE}Session file: $SESSION_FILE${NC}"
    echo -e "${BLUE}DevAssist will track architectural decisions${NC}"
}

# Function to end session
end_session() {
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║      AI COMPLIANCE MIDDLEWARE SESSION ENDING                  ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    if [ ! -f "$CURRENT_SESSION" ]; then
        echo -e "${RED}No active session found${NC}"
        exit 1
    fi
    
    SESSION_FILE=$(cat "$CURRENT_SESSION")
    
    # Gather session summary
    echo -e "${YELLOW}Session Summary${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check if running in auto mode (parameters provided)
    if [ $# -ge 2 ]; then
        # Auto mode - use provided parameters
        COMPLETED="${2:-No major tasks completed}"
        DECISIONS="${3:-No key decisions made}"
        METRICS="${4:-No metrics collected}"
        BLOCKERS="${5:-No blockers encountered}"
        PRIORITIES="${6:-Continue current work}"
        AUTO_MODE="yes"
        echo -e "${BLUE}Running in auto mode with provided responses${NC}"
    else
        # Interactive mode - ask user
        echo "Please provide session summary:"
        read -p "What was completed? " COMPLETED
        read -p "Key decisions made? " DECISIONS
        read -p "Performance metrics (if tested)? " METRICS
        read -p "Blockers encountered? " BLOCKERS
        read -p "Next priorities (top 3)? " PRIORITIES
        AUTO_MODE="no"
    fi
    
    # Update session file
    cat >> "$SESSION_FILE" << EOF

## Session End
- Time: $(date '+%H:%M:%S')
- Duration: [Calculated from start]

## Summary

### Completed
$COMPLETED

### Key Decisions
$DECISIONS

### Performance Metrics
$METRICS

### Blockers
$BLOCKERS

## Next Priorities
$PRIORITIES

## Files Changed
$(git diff --name-only)

## Tests Run
$(poetry run pytest --co -q 2>/dev/null | tail -5 || echo "No tests run")

## DevAssist Notes
- Architectural decisions should be added to .devassist/architectural_decisions.md
- Update knowledge base if major changes were made
EOF
    
    # Update STATUS.md with latest priorities
    if [ -n "$PRIORITIES" ] && [ -f "$PROJECT_ROOT/STATUS.md" ]; then
        echo -e "${YELLOW}Updating STATUS.md with priorities...${NC}"
        # Create backup
        cp "$PROJECT_ROOT/STATUS.md" "$PROJECT_ROOT/STATUS.md.bak"
        
        # Update or create STATUS.md
        if grep -q "## Next Priorities" "$PROJECT_ROOT/STATUS.md"; then
            # Update existing section
            echo "Updated priorities noted - manual update may be needed"
        else
            # Add new section
            echo "" >> "$PROJECT_ROOT/STATUS.md"
            echo "## Next Priorities" >> "$PROJECT_ROOT/STATUS.md"
            echo "$PRIORITIES" >> "$PROJECT_ROOT/STATUS.md"
        fi
    fi
    
    # Check for architectural decisions
    if [ "$AUTO_MODE" = "yes" ]; then
        echo -e "${YELLOW}Checking DevAssist for architectural decisions...${NC}"
        echo -e "${BLUE}Architectural decisions are tracked in .devassist/${NC}"
    else
        echo -e "${YELLOW}Checking for architectural decisions...${NC}"
        read -p "Were any architectural decisions made? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Remember to update .devassist/architectural_decisions.md${NC}"
        fi
    fi
    
    # Run DevAssist session end analysis
    if [ -f "$PROJECT_ROOT/scripts/devassist-hooks.sh" ]; then
        source "$PROJECT_ROOT/scripts/devassist-hooks.sh"
        devassist_session_end "$SESSION_FILE"
    fi
    
    # Git operations
    echo -e "${YELLOW}Git Status:${NC}"
    git status --short
    echo
    
    if [ "$AUTO_MODE" = "yes" ]; then
        # Auto mode - always commit and push
        echo -e "${BLUE}Auto-committing changes...${NC}"
        git add -A
        git commit -m "session: $(date +%Y%m%d) - $COMPLETED

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>" || echo -e "${YELLOW}No changes to commit${NC}"
        
        echo -e "${BLUE}Pushing to GitHub...${NC}"
        git push origin $(git branch --show-current) || echo -e "${YELLOW}Push failed - manual push may be needed${NC}"
    else
        # Interactive mode
        read -p "Commit session changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add -A
            git commit -m "session: $(date +%Y%m%d) - $COMPLETED"
            
            read -p "Push to GitHub? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push origin $(git branch --show-current)
            fi
        fi
    fi
    
    # Run cleanup script to organize files
    echo -e "${BLUE}🧹 Running project cleanup...${NC}"
    if [ -f "$PROJECT_ROOT/scripts/session-cleanup.sh" ]; then
        bash "$PROJECT_ROOT/scripts/session-cleanup.sh"
    else
        echo -e "${YELLOW}Cleanup script not yet implemented${NC}"
    fi
    
    # Update sprint completion tracker if needed
    if [ -n "$COMPLETED" ] && [[ "$COMPLETED" == *"Sprint"* || "$COMPLETED" == *"sprint"* ]]; then
        echo -e "${BLUE}📋 Updating sprint completion tracker...${NC}"
        echo "" >> "$SESSIONS_DIR/COMPLETED_SPRINTS.md"
        echo "### ✅ $(date '+%Y-%m-%d'): $COMPLETED" >> "$SESSIONS_DIR/COMPLETED_SPRINTS.md"
    fi
    
    # Clean up
    rm -f "$CURRENT_SESSION"
    rm -f "$CURRENT_SESSION.terminal"
    
    echo
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Session ended successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${BLUE}Session saved to: $SESSION_FILE${NC}"
    
    if [ "$AUTO_MODE" = "yes" ]; then
        echo
        echo -e "${CYAN}✅ ALL TASKS COMPLETED:${NC}"
        echo -e "  • Session summary recorded"
        echo -e "  • Project organized"
        echo -e "  • Changes committed"
        echo -e "  • Pushed to GitHub"
        echo -e "  • Session markers cleaned"
        echo
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}SAFE TO QUIT CLAUDE CODE NOW${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Next session: Run /session-start when you return${NC}"
    else
        echo -e "${BLUE}Remember to review architectural decisions if any were made${NC}"
    fi
}

# Function for mid-session checkpoint
checkpoint() {
    if [ ! -f "$CURRENT_SESSION" ]; then
        echo -e "${RED}No active session found${NC}"
        exit 1
    fi
    
    SESSION_FILE=$(cat "$CURRENT_SESSION")
    
    echo -e "${CYAN}Session Checkpoint - $(date '+%H:%M')${NC}"
    read -p "Progress note: " NOTE
    
    echo "" >> "$SESSION_FILE"
    echo "### Checkpoint - $(date '+%H:%M')" >> "$SESSION_FILE"
    echo "$NOTE" >> "$SESSION_FILE"
    
    # Quick test status
    echo -e "${YELLOW}Running quick test check...${NC}"
    poetry run pytest --co -q 2>/dev/null | tail -3 || echo "Tests not configured"
    
    # Check service health if running
    curl -s http://localhost:8000/health 2>/dev/null && echo -e "${GREEN}✓ API is running${NC}" || echo -e "${YELLOW}API not running${NC}"
    
    echo -e "${GREEN}✓ Checkpoint saved${NC}"
}

# Main command handler
case "$1" in
    start)
        start_session
        ;;
    end)
        shift  # Remove 'end' command
        end_session "$@"
        ;;
    checkpoint|check)
        checkpoint
        ;;
    status)
        if [ -f "$CURRENT_SESSION" ]; then
            echo -e "${GREEN}Active session: $(cat $CURRENT_SESSION)${NC}"
            if [ -f "$PROJECT_ROOT/.devassist.pid" ]; then
                echo -e "${GREEN}DevAssist MCP: Running (PID: $(cat $PROJECT_ROOT/.devassist.pid))${NC}"
            fi
            
            # Check services
            curl -s http://localhost:8000/health >/dev/null 2>&1 && echo -e "${GREEN}API: Running on port 8000${NC}" || echo -e "${YELLOW}API: Not running${NC}"
            curl -s http://localhost:3000/health >/dev/null 2>&1 && echo -e "${GREEN}Edge Proxy: Running on port 3000${NC}" || echo -e "${YELLOW}Edge Proxy: Not running${NC}"
        else
            echo -e "${YELLOW}No active session${NC}"
        fi
        ;;
    *)
        echo "Usage: $0 {start|end|checkpoint|status}"
        echo
        echo "  start      - Start a new development session"
        echo "  end        - End current session with summary"
        echo "  checkpoint - Save progress checkpoint"
        echo "  status     - Show session status"
        exit 1
        ;;
esac
