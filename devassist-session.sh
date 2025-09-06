#!/bin/bash

# DevAssist Session Commands for Claude Code
# This script provides the bridge between Claude Code commands and DevAssist tools

case "$1" in
  "start")
    echo "🔥 Starting DevAssist Session with Warmup..."
    echo "Tell Claude: 'Use DevAssist start_session tool to begin development'"
    echo ""
    echo "The warmup will:"
    echo "  • Load previous context"
    echo "  • Analyze recent changes"
    echo "  • Prepare search indices"
    echo "  • Check pending tasks"
    echo "  • Prime the AI context"
    ;;
    
  "end")
    echo "🏁 Ending DevAssist Session..."
    echo "Tell Claude: 'Use DevAssist end_session tool to save context'"
    echo ""
    echo "This will:"
    echo "  • Run cleanup agent"
    echo "  • Save session knowledge"
    echo "  • Archive logs"
    echo "  • Preserve context for next time"
    ;;
    
  "status")
    echo "📊 Getting DevAssist Status..."
    echo "Tell Claude: 'Use DevAssist get_status tool'"
    ;;
    
  *)
    echo "DevAssist Claude Code Integration"
    echo "================================="
    echo ""
    echo "Usage:"
    echo "  ./devassist-session.sh start  - Start session with warmup"
    echo "  ./devassist-session.sh end    - End session with cleanup"
    echo "  ./devassist-session.sh status - Check DevAssist status"
    echo ""
    echo "Important: These commands tell you what to ask Claude."
    echo "Claude Code slash commands (/) are different from DevAssist tools."
    echo ""
    echo "For warmup to work, you must use DevAssist tools, not slash commands!"
    ;;
esac