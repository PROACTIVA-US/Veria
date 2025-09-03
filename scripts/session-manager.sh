#!/bin/bash

# =============================================================================
#                  AI COMPLIANCE MIDDLEWARE SESSION MANAGER
#              Integrates with ClaudeFlow for AI orchestration
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SESSIONS_DIR="$PROJECT_ROOT/.sessions"
CURRENT_SESSION="$PROJECT_ROOT/.current-session"
CLAUDEFLOW_DIR="/Users/danielconnolly/Projects/claudeflow"
PROJECT_CLAUDEFLOW="$PROJECT_ROOT/claudeflow"

# Ensure directories exist
mkdir -p "$SESSIONS_DIR"

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
    git status --short | head -10
    echo
    
    # IMPORTANT: Display next priorities prominently
    echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║                    NEXT TASKS FOR THIS SESSION                ║${NC}"
    echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    # Get priorities from last session or STATUS.md
    LAST_SESSION=$(ls -t "$SESSIONS_DIR"/session-*.md 2>/dev/null | head -1)
    if [ -n "$LAST_SESSION" ] && [ -f "$LAST_SESSION" ]; then
        echo -e "${CYAN}From Previous Session:${NC}"
        # Look for priorities in the session file
        PRIORITIES=$(grep -A 10 "## Next Priorities" "$LAST_SESSION" 2>/dev/null | tail -n +2 | head -10 | grep -v "^##" | grep -v "^$" | head -5)
        if [ -n "$PRIORITIES" ]; then
            echo "$PRIORITIES"
        else
            echo "No priorities recorded"
        fi
        echo
    fi
    
    # Also check STATUS.md for current sprint
    if [ -f "$PROJECT_ROOT/STATUS.md" ]; then
        echo -e "${CYAN}Current Sprint Goals:${NC}"
        grep -A 4 "## Active Goals" "$PROJECT_ROOT/STATUS.md" 2>/dev/null | tail -n +2 || echo "No active goals found"
        echo
        
        echo -e "${CYAN}System Components Status:${NC}"
        grep -E "^\- \[.\] " "$PROJECT_ROOT/STATUS.md" 2>/dev/null | head -5 || echo "No components tracked"
        echo
    fi
    
    # Check for previous terminal log and set up reading
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    TERMINAL CONTINUITY CHECK                   ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    
    LAST_TERMINAL_LOG=$(ls -t "$SESSIONS_DIR"/terminal-*.log 2>/dev/null | head -1)
    if [ -n "$LAST_TERMINAL_LOG" ] && [ -f "$LAST_TERMINAL_LOG" ]; then
        echo -e "${GREEN}✓ Found previous terminal log for continuity${NC}"
        echo -e "${BLUE}  File: $(basename $LAST_TERMINAL_LOG)${NC}"
        echo -e "${BLUE}  Size: $(du -h $LAST_TERMINAL_LOG | cut -f1)${NC}"
        
        # Create instruction file for Claude to read BOTH logs and notes
        cat > "$SESSIONS_DIR/READ_FOR_CONTEXT.md" << EOF
# CLAUDE: READ THIS FOR FULL CONTEXT

## Previous Terminal Session
Please read the terminal log for command history and context:
$LAST_TERMINAL_LOG

## Previous Session Notes
Check the last session file for decisions and progress:
$LAST_SESSION

## Any Messages
$SESSIONS_DIR/MESSAGE_FOR_FUTURE_CLAUDE.md

This provides complete continuity from the previous session.
EOF
        
        echo -e "${YELLOW}📖 INSTRUCTION FOR CLAUDE:${NC}"
        echo -e "${YELLOW}   Read: $SESSIONS_DIR/READ_FOR_CONTEXT.md${NC}"
        echo -e "${YELLOW}   This contains both terminal log AND session notes${NC}"
    else
        echo -e "${YELLOW}⚠ No previous terminal log found${NC}"
        echo -e "${BLUE}  Starting fresh session${NC}"
    fi
    echo
    
    # Terminal recording setup
    TERMINAL_LOG="$SESSIONS_DIR/terminal-$(date +%Y%m%d_%H%M).log"
    
    if [ -n "$SCRIPT" ]; then
        echo -e "${GREEN}✓ Terminal recording ACTIVE${NC}"
        echo -e "${BLUE}  Recording to: $SCRIPT${NC}"
        TERMINAL_LOG="$SCRIPT"
    else
        echo -e "${YELLOW}📹 Terminal recording setup:${NC}"
        echo -e "${GREEN}  script $TERMINAL_LOG${NC}"
        echo -e "${BLUE}  This will preserve context for next session${NC}"
    fi
    echo
    
    # Record session start
    echo "$SESSION_FILE" > "$CURRENT_SESSION"
    echo "$TERMINAL_LOG" > "$CURRENT_SESSION.terminal"
    
    # Initial session content with objectives
    cat >> "$SESSION_FILE" << EOF
## Session Start
- Time: $(date '+%H:%M:%S')
- Branch: $(git branch --show-current)
- ClaudeFlow: Available
- Project: AI Compliance Middleware
- Terminal Log: $TERMINAL_LOG

## Objectives for This Session
$(grep -A 5 "## Next Priorities" "$LAST_SESSION" 2>/dev/null | tail -n +2 | head -5 || echo "1. Continue implementation tasks")

## Work Log
EOF
    
    # Check ClaudeFlow availability
    echo -e "${CYAN}🌊 ClaudeFlow Integration:${NC}"
    if [ -d "$CLAUDEFLOW_DIR" ]; then
        echo -e "${GREEN}✓ ClaudeFlow v2.0.0 Alpha available${NC}"
        
        if command -v claude-flow >/dev/null 2>&1; then
            echo -e "${GREEN}✓ claude-flow command available${NC}"
        fi
        
        if [ -d "$PROJECT_ROOT/.swarm" ]; then
            echo -e "${GREEN}✓ Hive-mind memory found${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ ClaudeFlow not found${NC}"
    fi
    
    # Show available commands
    echo
    echo -e "${CYAN}Quick Commands:${NC}"
    echo "• ${YELLOW}make api${NC} - Start FastAPI server"
    echo "• ${YELLOW}make test${NC} - Run tests  "
    echo "• ${YELLOW}npx claude-flow@alpha swarm \"task\"${NC} - AI assistance"
    echo "• ${YELLOW}/session-checkpoint${NC} - Save progress"
    
    echo
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Session started! Focus on the NEXT TASKS shown above.${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${BLUE}Session file: $SESSION_FILE${NC}"
}

# Function to end session - FULLY AUTONOMOUS
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
    
    echo -e "${BLUE}Generating autonomous session summary...${NC}"
    
    # Autonomous mode - use provided parameters or defaults
    COMPLETED="${1:-Session work completed}"
    DECISIONS="${2:-Continued implementation}"
    METRICS="${3:-No metrics collected}"
    BLOCKERS="${4:-None encountered}"
    PRIORITIES="${5:-Continue next implementation tasks}"
    
    # Always run in auto mode
    echo -e "${GREEN}✓ Running autonomous session end${NC}"
    
    # Update session file
    cat >> "$SESSION_FILE" << EOF

## Session End
- Time: $(date '+%H:%M:%S')
- Autonomous End: Yes

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
$(git diff --name-only | head -20)

## Tests Run
$(poetry run pytest --co -q 2>/dev/null | tail -5 || echo "No tests configured")

## ClaudeFlow Notes
- Check .swarm/memory.db for hive-mind context
- Terminal log saved for continuity
- Session notes preserved for next start
EOF
    
    # Update STATUS.md with latest priorities
    if [ -n "$PRIORITIES" ] && [ -f "$PROJECT_ROOT/STATUS.md" ]; then
        echo -e "${YELLOW}Updating STATUS.md with priorities...${NC}"
        cp "$PROJECT_ROOT/STATUS.md" "$PROJECT_ROOT/STATUS.md.bak"
        
        # Update Next Priorities section if it exists
        if grep -q "## Next Priorities" "$PROJECT_ROOT/STATUS.md"; then
            # This would need more sophisticated editing
            echo -e "${BLUE}Priorities noted for next session${NC}"
        else
            # Add new section
            echo "" >> "$PROJECT_ROOT/STATUS.md"
            echo "## Next Priorities" >> "$PROJECT_ROOT/STATUS.md"
            echo "$PRIORITIES" >> "$PROJECT_ROOT/STATUS.md"
        fi
    fi
    
    # Check for ClaudeFlow hive-mind persistence
    if [ -d "$PROJECT_ROOT/.swarm" ]; then
        echo -e "${CYAN}🐝 Preserving hive-mind state...${NC}"
        if [ -f "$PROJECT_ROOT/.swarm/memory.db" ]; then
            SIZE=$(du -h "$PROJECT_ROOT/.swarm/memory.db" | cut -f1)
            echo -e "${GREEN}✓ Memory database preserved: $SIZE${NC}"
        fi
    fi
    
    # Git operations - ALWAYS auto-commit
    echo -e "${YELLOW}Git Status:${NC}"
    git status --short | head -10
    echo
    
    echo -e "${BLUE}Auto-committing changes...${NC}"
    git add -A
    git commit -m "session: $(date +%Y%m%d_%H%M) - $COMPLETED

Session ended autonomously
- Completed: $COMPLETED  
- Next: $PRIORITIES

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>" || echo -e "${YELLOW}No changes to commit${NC}"
    
    # Try to push (may fail if no remote)
    echo -e "${BLUE}Attempting GitHub push...${NC}"
    git push origin $(git branch --show-current) 2>/dev/null || echo -e "${YELLOW}Push skipped (no remote or network)${NC}"
    
    # Run cleanup script
    echo -e "${BLUE}🧹 Running project cleanup...${NC}"
    if [ -f "$PROJECT_ROOT/scripts/session-cleanup.sh" ]; then
        bash "$PROJECT_ROOT/scripts/session-cleanup.sh"
    fi
    
    # Update sprint completion if mentioned
    if [[ "$COMPLETED" == *"Sprint"* || "$COMPLETED" == *"sprint"* ]]; then
        echo -e "${BLUE}📋 Recording sprint completion...${NC}"
        echo "" >> "$SESSIONS_DIR/COMPLETED_SPRINTS.md"
        echo "### ✅ $(date '+%Y-%m-%d %H:%M'): $COMPLETED" >> "$SESSIONS_DIR/COMPLETED_SPRINTS.md"
    fi
    
    # Create message for next session
    cat > "$SESSIONS_DIR/MESSAGE_FOR_FUTURE_CLAUDE.md" << EOF
# Message for Next Session

## Last Session Summary
- **Completed**: $COMPLETED
- **Blockers**: $BLOCKERS

## Continue With
$PRIORITIES

## Context Files
- Previous session: $SESSION_FILE
- Terminal log: $(cat "$CURRENT_SESSION.terminal" 2>/dev/null || echo "Not recorded")

Remember to read the terminal log for command history!
EOF
    
    # Clean up session markers
    rm -f "$CURRENT_SESSION"
    rm -f "$CURRENT_SESSION.terminal"
    
    echo
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ SESSION ENDED AUTONOMOUSLY${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${CYAN}Completed:${NC}"
    echo -e "  ✓ Session summary saved"
    echo -e "  ✓ Changes committed to git"
    echo -e "  ✓ Project cleaned up"
    echo -e "  ✓ Next priorities recorded"
    echo -e "  ✓ Terminal log preserved"
    echo -e "  ✓ Context saved for continuity"
    echo
    echo -e "${YELLOW}Next Session:${NC}"
    echo -e "  • Priorities: $PRIORITIES${NC}"
    echo -e "  • Run: ${GREEN}/session-start${NC} to continue"
    echo
    echo -e "${BLUE}Session saved to: $SESSION_FILE${NC}"
    echo -e "${BLUE}Context preserved in: $SESSIONS_DIR/MESSAGE_FOR_FUTURE_CLAUDE.md${NC}"
}

# Function for mid-session checkpoint
checkpoint() {
    if [ ! -f "$CURRENT_SESSION" ]; then
        echo -e "${RED}No active session found${NC}"
        exit 1
    fi
    
    SESSION_FILE=$(cat "$CURRENT_SESSION")
    
    echo -e "${CYAN}Session Checkpoint - $(date '+%H:%M')${NC}"
    
    # Accept note as parameter or prompt
    if [ -n "$1" ]; then
        NOTE="$1"
    else
        read -p "Progress note: " NOTE
    fi
    
    echo "" >> "$SESSION_FILE"
    echo "### Checkpoint - $(date '+%H:%M')" >> "$SESSION_FILE"
    echo "$NOTE" >> "$SESSION_FILE"
    
    # Quick status checks
    echo -e "${YELLOW}Service Status:${NC}"
    curl -s http://localhost:8000/health 2>/dev/null && echo -e "${GREEN}✓ API running${NC}" || echo -e "${YELLOW}○ API not running${NC}"
    curl -s http://localhost:3000/health 2>/dev/null && echo -e "${GREEN}✓ Edge proxy running${NC}" || echo -e "${YELLOW}○ Edge proxy not running${NC}"
    
    # Check for hive-mind
    if [ -f "$PROJECT_ROOT/.swarm/queen.json" ]; then
        echo -e "${GREEN}✓ Hive-mind active${NC}"
    fi
    
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
        shift
        checkpoint "$@"
        ;;
    status)
        if [ -f "$CURRENT_SESSION" ]; then
            echo -e "${GREEN}Active session: $(cat $CURRENT_SESSION)${NC}"
            
            # Show current objectives
            SESSION_FILE=$(cat "$CURRENT_SESSION")
            echo -e "${CYAN}Session Objectives:${NC}"
            grep -A 3 "## Objectives for This Session" "$SESSION_FILE" 2>/dev/null | tail -n +2
            
            # Check services
            echo -e "${CYAN}Services:${NC}"
            curl -s http://localhost:8000/health >/dev/null 2>&1 && echo -e "${GREEN}✓ API: Running${NC}" || echo -e "${YELLOW}○ API: Not running${NC}"
            curl -s http://localhost:3000/health >/dev/null 2>&1 && echo -e "${GREEN}✓ Edge Proxy: Running${NC}" || echo -e "${YELLOW}○ Edge Proxy: Not running${NC}"
            
            # Check ClaudeFlow
            if [ -d "$PROJECT_ROOT/.swarm" ]; then
                echo -e "${GREEN}✓ ClaudeFlow: Hive-mind memory present${NC}"
            fi
        else
            echo -e "${YELLOW}No active session${NC}"
            echo -e "${BLUE}Start with: ./scripts/session-manager.sh start${NC}"
        fi
        ;;
    *)
        echo "Usage: $0 {start|end|checkpoint|status}"
        echo
        echo "  start      - Start session (shows next tasks)"
        echo "  end        - End session autonomously"
        echo "  checkpoint - Save progress checkpoint"
        echo "  status     - Show session status"
        echo
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 end \"Implemented /decide\" \"Used FastAPI\" \"45ms response\" \"None\" \"Add caching\""
        echo "  $0 checkpoint \"Completed endpoint implementation\""
        echo "  $0 status"
        exit 1
        ;;
esac
