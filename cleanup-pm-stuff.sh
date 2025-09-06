#!/bin/bash

# Cleanup script to remove PM-related stuff while preserving valuable code
# Run from /Users/danielconnolly/Projects/Veria

echo "🧹 Starting cleanup of PM-related files..."
echo "This will ONLY remove project management stuff, keeping all valuable code."
echo ""

# Backup first
echo "📦 Creating backup..."
cp -r . ../Veria-backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "Backup already exists or failed"

# Remove ClaudeFlow related files if they exist
echo "🗑️  Removing ClaudeFlow files..."
rm -rf .claudeflow 2>/dev/null
rm -f claudeflow.* 2>/dev/null
rm -rf packages/claudeflow 2>/dev/null
find . -name "*claudeflow*" -type f -delete 2>/dev/null

# Clean up old session management files (but keep DevAssist sessions)
echo "🗑️  Cleaning up old session files..."
# Keep DevAssist sessions but remove old/temporary session files
find .sessions -name "session-*.md" -mtime +7 -delete 2>/dev/null
find .sessions -name "checkpoint_*.json" -mtime +7 -delete 2>/dev/null

# Remove status/sprint tracking files that are PM-related
echo "🗑️  Removing PM tracking files..."
rm -f SPRINT_*.md 2>/dev/null
rm -f STATUS.md.bak 2>/dev/null
rm -f DO_THIS_NOW.md 2>/dev/null
rm -f COMPLETED_SPRINTS.md 2>/dev/null

# Clean up any emergency fix scripts (these were temporary)
echo "🗑️  Removing temporary fix scripts..."
rm -f emergency-fix-*.sh 2>/dev/null
rm -f final-fix-*.sh 2>/dev/null
rm -f fix-*.sh 2>/dev/null

# Remove test scripts that were for debugging DevAssist
echo "🗑️  Removing test/debug scripts..."
rm -f test-devassist-*.mjs 2>/dev/null
rm -f test-warmup.sh 2>/dev/null

# Clean up node_modules if needed (optional - uncomment if you want)
# echo "🗑️  Cleaning node_modules..."
# find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null

# Clean Python cache
echo "🗑️  Cleaning Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null

# Remove .DS_Store files
echo "🗑️  Removing .DS_Store files..."
find . -name ".DS_Store" -delete 2>/dev/null

echo ""
echo "✅ Cleanup complete! Preserved:"
echo "  - All packages (blockchain, database, compliance_middleware, edge_proxy)"
echo "  - DevAssist configuration and core files"
echo "  - Business documentation"
echo "  - Git repository"
echo "  - Docker and infrastructure files"
echo "  - All source code"
echo ""
echo "📊 Current structure:"
ls -la

echo ""
echo "💡 Next steps:"
echo "1. Review what's left: ls -la"
echo "2. Merge in your bundle structure from Veria-Platform if needed"
echo "3. Commit the cleaned state: git add . && git commit -m 'Removed PM-related files'"
