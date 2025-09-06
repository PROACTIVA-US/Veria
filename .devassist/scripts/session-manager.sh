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
