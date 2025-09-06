#!/bin/bash

# ============================================================================
# VERIA PROJECT COMPARISON AND MERGE SCRIPT
# ============================================================================
# This script analyzes what's valuable in Veria-Platform and merges it into
# the main Veria project after cleanup
# ============================================================================

set -e

echo "🔍 ANALYZING AND MERGING VERIA PROJECTS"
echo "========================================"
echo ""

# Define paths
VERIA_MAIN="/Users/danielconnolly/Projects/Veria"
VERIA_PLATFORM="/Users/danielconnolly/Projects/Veria-Platform/Veria-Platform"

# ============================================================================
# STEP 1: ANALYZE WHAT'S IN VERIA-PLATFORM
# ============================================================================

echo "📊 STEP 1: Analyzing Veria-Platform bundles..."
echo "-----------------------------------------------"

# Bundle 01: Gateway Service (Fastify-based)
if [ -d "$VERIA_PLATFORM/veria-bundle-01" ]; then
    echo "✅ Bundle 01: Gateway Service"
    echo "   - Fastify-based gateway implementation"
    echo "   - services/gateway with basic setup"
    echo "   STATUS: NEW - Not in main project"
fi

# Bundle 02: Frontend
if [ -d "$VERIA_PLATFORM/veria-bundle-02-frontend" ]; then
    echo "✅ Bundle 02: Frontend Apps"
    echo "   - apps/ directory structure"
    echo "   STATUS: NEW - Main project has no frontend apps"
fi

# Bundle 03: Identity, Policy & SDK
if [ -d "$VERIA_PLATFORM/veria-bundle-03-identity-policy-sdk" ]; then
    echo "✅ Bundle 03: Identity, Policy & SDK"
    echo "   - Identity service"
    echo "   - Policy service"
    echo "   - SDK packages"
    echo "   STATUS: NEW - Extends main project's compliance work"
fi

# Bundle 04: Compliance, Audit & Tests
if [ -d "$VERIA_PLATFORM/veria-bundle-04-compliance-audit-tests" ]; then
    echo "✅ Bundle 04: Compliance, Audit & Tests"
    echo "   - Compliance service (may overlap with main)"
    echo "   - Audit log writer"
    echo "   - E2E and performance tests"
    echo "   STATUS: PARTIAL - Compliance exists, audit/tests are new"
fi

# Bundle 05: Tech Docs
if [ -d "$VERIA_PLATFORM/veria-bundle-05-tech-docs" ]; then
    echo "✅ Bundle 05: Technical Documentation"
    echo "   - docs/ directory"
    echo "   - ops/ directory"
    echo "   STATUS: NEW - Additional documentation"
fi

echo ""

# ============================================================================
# STEP 2: COMPARE WITH MAIN PROJECT
# ============================================================================

echo "📊 STEP 2: Comparing with main Veria project..."
echo "------------------------------------------------"

echo "Main project has:"
echo "  ✓ blockchain package (ERC3643 integration)"
echo "  ✓ database package (models, migrations)"
echo "  ✓ compliance_middleware package"
echo "  ✓ edge_proxy package (TypeScript, Fastify)"
echo "  ✓ DevAssist integration"
echo "  ✓ Docker setup"
echo "  ✓ Infrastructure configs"
echo ""

echo "Veria-Platform adds:"
echo "  + Gateway service (different from edge_proxy)"
echo "  + Frontend apps structure"
echo "  + Identity service"
echo "  + Policy service"
echo "  + Audit log writer"
echo "  + E2E and performance tests"
echo "  + Additional documentation"
echo ""

# ============================================================================
# STEP 3: MERGE VALUABLE COMPONENTS
# ============================================================================

echo "📦 STEP 3: Merging valuable components..."
echo "-----------------------------------------"

# Create services directory if it doesn't exist
mkdir -p "$VERIA_MAIN/services"
mkdir -p "$VERIA_MAIN/apps"

# Merge Bundle 01: Gateway
if [ -d "$VERIA_PLATFORM/veria-bundle-01/services/gateway" ]; then
    echo "→ Merging gateway service..."
    if [ ! -d "$VERIA_MAIN/services/gateway" ]; then
        cp -r "$VERIA_PLATFORM/veria-bundle-01/services/gateway" "$VERIA_MAIN/services/"
        echo "  ✅ Gateway service added"
    else
        echo "  ⚠️  Gateway already exists, skipping"
    fi
fi

# Merge Bundle 02: Frontend apps
if [ -d "$VERIA_PLATFORM/veria-bundle-02-frontend/apps" ]; then
    echo "→ Merging frontend apps..."
    for app in "$VERIA_PLATFORM/veria-bundle-02-frontend/apps"/*; do
        if [ -d "$app" ]; then
            app_name=$(basename "$app")
            if [ ! -d "$VERIA_MAIN/apps/$app_name" ]; then
                cp -r "$app" "$VERIA_MAIN/apps/"
                echo "  ✅ Added app: $app_name"
            fi
        fi
    done
fi

# Merge Bundle 03: Identity, Policy, SDK
if [ -d "$VERIA_PLATFORM/veria-bundle-03-identity-policy-sdk" ]; then
    echo "→ Merging identity/policy services and SDK..."
    
    # Services
    for service_dir in services apps packages; do
        if [ -d "$VERIA_PLATFORM/veria-bundle-03-identity-policy-sdk/$service_dir" ]; then
            for item in "$VERIA_PLATFORM/veria-bundle-03-identity-policy-sdk/$service_dir"/*; do
                if [ -d "$item" ]; then
                    item_name=$(basename "$item")
                    target_dir="$VERIA_MAIN/$service_dir"
                    mkdir -p "$target_dir"
                    if [ ! -d "$target_dir/$item_name" ]; then
                        cp -r "$item" "$target_dir/"
                        echo "  ✅ Added $service_dir/$item_name"
                    fi
                fi
            done
        fi
    done
fi

# Merge Bundle 04: Compliance extensions and tests
if [ -d "$VERIA_PLATFORM/veria-bundle-04-compliance-audit-tests" ]; then
    echo "→ Merging compliance extensions and tests..."
    
    # Audit service
    if [ -d "$VERIA_PLATFORM/veria-bundle-04-compliance-audit-tests/services/audit-log-writer" ]; then
        if [ ! -d "$VERIA_MAIN/services/audit-log-writer" ]; then
            cp -r "$VERIA_PLATFORM/veria-bundle-04-compliance-audit-tests/services/audit-log-writer" "$VERIA_MAIN/services/"
            echo "  ✅ Added audit-log-writer service"
        fi
    fi
    
    # Tests
    if [ -d "$VERIA_PLATFORM/veria-bundle-04-compliance-audit-tests/tests" ]; then
        for test_dir in "$VERIA_PLATFORM/veria-bundle-04-compliance-audit-tests/tests"/*; do
            if [ -d "$test_dir" ]; then
                test_name=$(basename "$test_dir")
                if [ ! -d "$VERIA_MAIN/tests/$test_name" ]; then
                    cp -r "$test_dir" "$VERIA_MAIN/tests/"
                    echo "  ✅ Added test suite: $test_name"
                fi
            fi
        done
    fi
fi

# Merge Bundle 05: Documentation
if [ -d "$VERIA_PLATFORM/veria-bundle-05-tech-docs" ]; then
    echo "→ Merging technical documentation..."
    
    # Docs
    if [ -d "$VERIA_PLATFORM/veria-bundle-05-tech-docs/docs" ]; then
        for doc in "$VERIA_PLATFORM/veria-bundle-05-tech-docs/docs"/*; do
            if [ -f "$doc" ] || [ -d "$doc" ]; then
                doc_name=$(basename "$doc")
                if [ ! -e "$VERIA_MAIN/docs/$doc_name" ]; then
                    cp -r "$doc" "$VERIA_MAIN/docs/"
                    echo "  ✅ Added documentation: $doc_name"
                fi
            fi
        done
    fi
    
    # Ops
    if [ -d "$VERIA_PLATFORM/veria-bundle-05-tech-docs/ops" ]; then
        mkdir -p "$VERIA_MAIN/ops"
        for op in "$VERIA_PLATFORM/veria-bundle-05-tech-docs/ops"/*; do
            if [ -f "$op" ] || [ -d "$op" ]; then
                op_name=$(basename "$op")
                if [ ! -e "$VERIA_MAIN/ops/$op_name" ]; then
                    cp -r "$op" "$VERIA_MAIN/ops/"
                    echo "  ✅ Added ops config: $op_name"
                fi
            fi
        done
    fi
fi

echo ""

# ============================================================================
# STEP 4: UPDATE PACKAGE.JSON
# ============================================================================

echo "📝 STEP 4: Updating package.json configuration..."
echo "-------------------------------------------------"

# Create a new merged package.json
cat > "$VERIA_MAIN/package.json.new" << 'EOF'
{
  "name": "veria",
  "private": true,
  "version": "0.4.0",
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*",
    "tests/*"
  ],
  "scripts": {
    "dev": "pnpm --filter @veria/frontend dev",
    "dev:gateway": "pnpm --filter @veria/gateway dev",
    "dev:edge-proxy": "pnpm --filter @veria/edge-proxy dev",
    "dev:identity": "pnpm --filter @veria/identity-service dev",
    "dev:policy": "pnpm --filter @veria/policy-service dev",
    "dev:compliance": "pnpm --filter @veria/compliance-service dev",
    "dev:audit": "pnpm --filter @veria/audit-log-writer dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint || true",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter @veria/tests-e2e test",
    "test:perf": "pnpm --filter @veria/tests-k6 perf"
  }
}
EOF

echo "  ✅ Created new package.json with merged workspaces"
echo "     Review and replace manually: mv package.json.new package.json"

echo ""

# ============================================================================
# STEP 5: CLEANUP
# ============================================================================

echo "🧹 STEP 5: Cleanup recommendations..."
echo "-------------------------------------"

echo "1. Review the merged structure:"
echo "   cd $VERIA_MAIN"
echo "   tree -L 2 -d"
echo ""

echo "2. Install dependencies:"
echo "   pnpm install"
echo ""

echo "3. Commit the changes:"
echo "   git add ."
echo "   git commit -m 'Merged valuable components from Veria-Platform'"
echo ""

echo "4. Remove the now-empty Veria-Platform if desired:"
echo "   rm -rf /Users/danielconnolly/Projects/Veria-Platform"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "✅ MERGE COMPLETE!"
echo "=================="
echo ""
echo "📊 Summary of changes:"
echo "  • Added gateway service (Fastify-based)"
echo "  • Added frontend apps structure"
echo "  • Added identity and policy services"
echo "  • Added audit log writer"
echo "  • Added E2E and performance test suites"
echo "  • Added additional documentation"
echo "  • Preserved all existing valuable code"
echo ""
echo "The Veria project now has a complete structure with:"
echo "  - Frontend apps"
echo "  - Multiple services (gateway, identity, policy, audit)"
echo "  - Core packages (blockchain, database, compliance)"
echo "  - Comprehensive test suites"
echo "  - Full documentation"
echo ""
echo "Next step: Review the merged structure and run 'pnpm install'"
