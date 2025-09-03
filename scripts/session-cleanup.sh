#!/bin/bash

# =============================================================================
#              AI COMPLIANCE MIDDLEWARE SESSION CLEANUP
#                Organizes project files after sessions
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}🧹 Running project cleanup...${NC}"

# Create directories if they don't exist
mkdir -p "$PROJECT_ROOT/docs/archive"
mkdir -p "$PROJECT_ROOT/.devassist/patterns"
mkdir -p "$PROJECT_ROOT/packages/compliance_middleware/tests"
mkdir -p "$PROJECT_ROOT/packages/edge_proxy/tests"

# Move any stray Python files to appropriate locations
find "$PROJECT_ROOT" -maxdepth 1 -name "*.py" -type f 2>/dev/null | while read file; do
    filename=$(basename "$file")
    if [[ "$filename" == test_* ]]; then
        echo "Moving $filename to tests directory"
        mv "$file" "$PROJECT_ROOT/packages/compliance_middleware/tests/"
    elif [[ "$filename" != setup.py ]]; then
        echo "Moving $filename to compliance_middleware package"
        mv "$file" "$PROJECT_ROOT/packages/compliance_middleware/"
    fi
done

# Move any stray TypeScript/JavaScript files
find "$PROJECT_ROOT" -maxdepth 1 -name "*.ts" -o -name "*.js" -type f 2>/dev/null | while read file; do
    filename=$(basename "$file")
    if [[ "$filename" == *.test.* ]] || [[ "$filename" == *.spec.* ]]; then
        echo "Moving $filename to edge_proxy tests"
        mv "$file" "$PROJECT_ROOT/packages/edge_proxy/tests/"
    else
        echo "Moving $filename to edge_proxy src"
        mv "$file" "$PROJECT_ROOT/packages/edge_proxy/src/"
    fi
done

# Archive old logs
find "$PROJECT_ROOT" -maxdepth 1 -name "*.log" -type f -mtime +7 2>/dev/null | while read file; do
    echo "Archiving old log: $(basename $file)"
    mv "$file" "$PROJECT_ROOT/docs/archive/"
done

# Clean Python cache
echo -e "${YELLOW}Cleaning Python cache...${NC}"
find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$PROJECT_ROOT" -type f -name "*.pyc" -delete 2>/dev/null || true

# Clean Node modules if needed
if [ -d "$PROJECT_ROOT/packages/edge_proxy/node_modules" ]; then
    # Just report size, don't auto-clean
    size=$(du -sh "$PROJECT_ROOT/packages/edge_proxy/node_modules" | cut -f1)
    echo -e "${BLUE}Node modules size: $size${NC}"
fi

# Update .gitignore if needed
if ! grep -q ".sessions/" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo -e "${YELLOW}Adding .sessions/ to .gitignore${NC}"
    echo ".sessions/" >> "$PROJECT_ROOT/.gitignore"
fi

if ! grep -q ".current-session" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo ".current-session*" >> "$PROJECT_ROOT/.gitignore"
fi

if ! grep -q ".devassist.pid" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo ".devassist.pid" >> "$PROJECT_ROOT/.gitignore"
fi

# Check for TODO/FIXME comments
echo -e "${YELLOW}Checking for TODO/FIXME comments...${NC}"
grep -r "TODO\|FIXME" "$PROJECT_ROOT/packages" --include="*.py" --include="*.ts" --include="*.js" 2>/dev/null | head -5 || echo "No TODOs found"

# Report file organization
echo -e "${GREEN}✓ Project cleanup complete${NC}"
echo -e "${BLUE}Structure:${NC}"
echo "  packages/compliance_middleware/ - Python FastAPI code"
echo "  packages/edge_proxy/ - Node.js Fastify code"
echo "  packages/mcp/ - MCP servers"
echo "  .sessions/ - Session logs"
echo "  .devassist/ - DevAssist data"

# Quick health check
if [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
    echo -e "${GREEN}✓ Poetry project configured${NC}"
fi

if [ -f "$PROJECT_ROOT/packages/edge_proxy/package.json" ]; then
    echo -e "${GREEN}✓ Node.js edge proxy configured${NC}"
fi

if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    echo -e "${GREEN}✓ Docker compose configured${NC}"
fi

echo -e "${BLUE}Ready for next session!${NC}"
