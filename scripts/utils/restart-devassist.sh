#!/bin/bash

# Restart DevAssist MCP for Claude Code
echo "🔄 Restarting DevAssist MCP Server for Claude Code..."

# Kill existing DevAssist processes
pkill -f "DevAssist_MCP/index.js" 2>/dev/null
pkill -f "project-orchestrator.js" 2>/dev/null

# Clear any stale project states
rm -f /Users/danielconnolly/Projects/Veria/.devassist/.no-generic 2>/dev/null

echo "✅ Cleared old processes"

# Note: Claude Code will restart the MCP servers automatically
echo "📝 Claude Code will restart MCP servers on next tool use"
echo ""
echo "⚠️  IMPORTANT: You need to restart Claude Code to pick up the config changes!"
echo ""
echo "Steps:"
echo "1. Exit Claude Code (Ctrl+C in terminal)"
echo "2. Run 'claude' again to restart"
echo "3. Navigate to Veria project: cd /Users/danielconnolly/Projects/Veria"
echo "4. Run /initproject again"
echo ""
echo "The enhanced initproject should then:"
echo "  - Ask about GitHub account (PROACTIVA-US vs PerformanceSuite)"
echo "  - Run warmup sequences with progress"
echo "  - Create documentation"
echo "  - Set up subagents"
echo "  - Show detailed initialization report"
