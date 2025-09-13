#!/bin/bash

# Fix Veria Project Structure - Remove duplicate nested directories
# This script will clean up the duplicate nested service directories

echo "Starting Veria project structure cleanup..."
echo "==========================================="

# Function to clean a service directory
clean_service() {
    local service_path=$1
    local service_name=$2
    
    echo "Checking $service_name..."
    
    # Check if the duplicate nested directory exists
    if [ -d "$service_path/$service_name" ]; then
        echo "  ⚠️  Found duplicate nested directory: $service_path/$service_name"
        
        # Check if parent has src directory (indicating it's the real service)
        if [ -d "$service_path/src" ]; then
            echo "  ✓ Parent directory has src/ - removing nested duplicate"
            rm -rf "$service_path/$service_name"
            echo "  ✓ Removed: $service_path/$service_name"
        else
            echo "  ⚠️  Parent directory missing src/ - needs manual review"
        fi
    fi
    
    # Check for cross-nested directories (e.g., ai-broker inside graph-service)
    for other_service in ai-broker graph-service; do
        if [ "$other_service" != "$service_name" ] && [ -d "$service_path/$other_service" ]; then
            echo "  ⚠️  Found cross-nested directory: $service_path/$other_service"
            rm -rf "$service_path/$other_service"
            echo "  ✓ Removed: $service_path/$other_service"
        fi
    done
}

# Main cleanup for services
echo ""
echo "Cleaning main services directory..."
echo "-----------------------------------"

# Clean ai-broker
clean_service "/Users/danielconnolly/Projects/Veria/services/ai-broker" "ai-broker"

# Clean graph-service  
clean_service "/Users/danielconnolly/Projects/Veria/services/graph-service" "graph-service"

# Now clean worktrees
echo ""
echo "Cleaning worktrees..."
echo "---------------------"

for worktree in backend blockchain devops docs frontend testing; do
    if [ -d "/Users/danielconnolly/Projects/Veria/.worktrees/$worktree" ]; then
        echo ""
        echo "Processing worktree: $worktree"
        
        # Clean ai-broker in worktree
        if [ -d "/Users/danielconnolly/Projects/Veria/.worktrees/$worktree/services/ai-broker" ]; then
            clean_service "/Users/danielconnolly/Projects/Veria/.worktrees/$worktree/services/ai-broker" "ai-broker"
        fi
        
        # Clean graph-service in worktree
        if [ -d "/Users/danielconnolly/Projects/Veria/.worktrees/$worktree/services/graph-service" ]; then
            clean_service "/Users/danielconnolly/Projects/Veria/.worktrees/$worktree/services/graph-service" "graph-service"
        fi
    fi
done

# Clean up the veria-vislzr-unified-bundle if it exists
if [ -d "/Users/danielconnolly/Projects/Veria/veria-vislzr-unified-bundle" ]; then
    echo ""
    echo "Cleaning veria-vislzr-unified-bundle..."
    echo "----------------------------------------"
    
    if [ -d "/Users/danielconnolly/Projects/Veria/veria-vislzr-unified-bundle/Veria/services/ai-broker" ]; then
        clean_service "/Users/danielconnolly/Projects/Veria/veria-vislzr-unified-bundle/Veria/services/ai-broker" "ai-broker"
    fi
    
    if [ -d "/Users/danielconnolly/Projects/Veria/veria-vislzr-unified-bundle/Veria/services/graph-service" ]; then
        clean_service "/Users/danielconnolly/Projects/Veria/veria-vislzr-unified-bundle/Veria/services/graph-service" "graph-service"
    fi
fi

echo ""
echo "==========================================="
echo "Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Clear Cursor cache: rm -rf ~/Library/Application\\ Support/Cursor/"
echo "2. Restart Cursor"
echo "3. Open the Veria project"
echo ""
echo "If issues persist, you may need to:"
echo "- Delete node_modules in all services: find /Users/danielconnolly/Projects/Veria -name 'node_modules' -type d -prune -exec rm -rf '{}' +"
echo "- Reinstall dependencies: cd /Users/danielconnolly/Projects/Veria && pnpm install"
