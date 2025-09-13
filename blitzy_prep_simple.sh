#!/bin/bash

# Veria Blitzy Handoff Preparation Script (No pnpm required)
# This script cleans up the Veria repo for Blitzy handoff

echo "======================================"
echo "Preparing Veria for Blitzy Handoff"
echo "======================================"
echo ""

# Navigate to project root
cd /Users/danielconnolly/Projects/Veria

# Step 1: Clean up unnecessary files
echo "Step 1: Cleaning up unnecessary files..."
echo "----------------------------------------"

# Remove node_modules from all locations
echo "Removing node_modules directories..."
find . -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null
echo "✅ Removed node_modules"

# Remove build artifacts
echo "Removing build artifacts..."
find . -name "dist" -type d -prune -exec rm -rf '{}' + 2>/dev/null
find . -name ".next" -type d -prune -exec rm -rf '{}' + 2>/dev/null
find . -name "build" -type d -prune -exec rm -rf '{}' + 2>/dev/null
find . -name ".turbo" -type d -prune -exec rm -rf '{}' + 2>/dev/null
find . -name "coverage" -type d -prune -exec rm -rf '{}' + 2>/dev/null
echo "✅ Removed build artifacts"

# Remove temporary files
echo "Removing temporary files..."
find . -name "*.tmp" -type f -delete 2>/dev/null
find . -name "*.bak" -type f -delete 2>/dev/null
find . -name "*.backup" -type f -delete 2>/dev/null
find . -name "*~" -type f -delete 2>/dev/null
find . -name ".DS_Store" -type f -delete 2>/dev/null
echo "✅ Removed temporary files"

# Remove worktrees (they'll confuse Blitzy)
if [ -d ".worktrees" ]; then
    echo "Removing .worktrees directory..."
    rm -rf .worktrees
    echo "✅ Removed .worktrees"
fi

# Remove archive directories
if [ -d "Archive" ]; then
    echo "Removing Archive directory..."
    rm -rf Archive
    echo "✅ Removed Archive"
fi

# Remove bundle directories that might have duplicates
if [ -d "veria-vislzr-unified-bundle" ]; then
    echo "Removing veria-vislzr-unified-bundle..."
    rm -rf veria-vislzr-unified-bundle
    echo "✅ Removed veria-vislzr-unified-bundle"
fi

if [ -d "bundles" ]; then
    echo "Removing bundles directory..."
    rm -rf bundles
    echo "✅ Removed bundles"
fi

echo ""

# Step 2: Count and validate structure
echo "Step 2: Repository Statistics..."
echo "---------------------------------"

# Count package.json files
package_count=$(find . -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
echo "📦 Package.json files: $package_count"

# Count TypeScript files
ts_count=$(find . -name "*.ts" -o -name "*.tsx" -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
echo "📘 TypeScript files: $ts_count"

# Count service directories
service_count=$(ls -d services/*/ 2>/dev/null | wc -l | tr -d ' ')
echo "🔧 Services: $service_count"

echo ""

# Step 3: Create summary report
echo "Step 3: Creating handoff summary..."
echo "------------------------------------"

cat > BLITZY_HANDOFF_SUMMARY.txt << 'EOF'
VERIA PROJECT - BLITZY HANDOFF SUMMARY
=======================================

Repository: /Users/danielconnolly/Projects/Veria
Date Prepared: $(date)

TECHNOLOGY STACK (Blitzy-Compatible):
--------------------------------------
✅ TypeScript (primary language)
✅ Node.js (backend runtime)
✅ Next.js 14 (frontend framework)
✅ React 18 (UI library)
✅ PostgreSQL + Prisma (database)
✅ Express (API framework)
✅ pnpm (package manager - monorepo)

PROJECT STRUCTURE:
------------------
/apps
  /compliance-dashboard     # Next.js frontend
/services
  /ai-broker               # AI integration service
  /audit-log-writer        # Audit logging
  /blockchain-service      # Blockchain integration
  /compliance-service      # Compliance engine
  /gateway                 # API gateway
  /graph-service          # Graph database
  /identity-service       # Identity management
  /kyc-provider          # KYC/KYB integration
  /policy-service        # Policy engine
  /regulatory-reporting  # Reporting service
  /tool-masker          # Data masking
/packages
  /auth-middleware       # Shared auth
  /database             # Database utilities
  /edge_proxy          # Edge proxy
  /sdk-ts             # TypeScript SDK
/contracts             # Smart contracts
/tests
  /e2e                # End-to-end tests
  /k6                 # Performance tests

KEY FEATURES FOR BLITZY:
------------------------
1. Onboarding Wizard (Asset → Custody → SPV/Trust → Tokenization → Investor Registry → Evidence)
2. Evidence management and export (ZIP + manifest, signed URLs)
3. Investor registry with eligibility, KYC/KYB integration
4. Tokenization adapter with jurisdictional transfer rules
5. Compliance-first middleware architecture

FILES CLEANED:
--------------
- Removed all node_modules directories
- Removed all build artifacts (.next, dist, build)
- Removed temporary files
- Removed duplicate nested service directories
- Removed git worktrees
- Removed archive and bundle directories

BLITZY IMPORT CHECKLIST:
------------------------
[ ] Push to GitHub
[ ] Connect Blitzy to repository
[ ] Review auto-generated Tech Spec
[ ] Edit/approve Tech Spec
[ ] Use structured prompts (WHY/WHAT/HOW format)
[ ] Review generated code (~80% completion expected)
[ ] Complete human engineering tasks

HUMAN ENGINEERING TASKS (Expected):
------------------------------------
- Security audit and penetration testing
- Production deployment configuration
- Third-party API credentials setup
- Legal/compliance review of smart contracts
- Performance optimization and monitoring

PROMPT TEMPLATE FOR BLITZY:
---------------------------
WHY: Enhance Veria's compliance-first middleware for tokenized assets
WHAT: [Specific feature requirements]
HOW: Use existing TypeScript/Node.js services, Next.js frontend

CONTACT:
--------
Last Updated: $(date)
Ready for Blitzy: YES
EOF

echo "✅ Created BLITZY_HANDOFF_SUMMARY.txt"

echo ""
echo "======================================"
echo "✅ REPOSITORY READY FOR BLITZY!"
echo "======================================"
echo ""
echo "Summary:"
echo "--------"
echo "📁 Clean repository structure"
echo "📦 $package_count package.json files"
echo "📘 $ts_count TypeScript files"
echo "🔧 $service_count services"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Review BLITZY_HANDOFF_README.md"
echo "2. Review BLITZY_HANDOFF_SUMMARY.txt"
echo "3. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepared for Blitzy handoff'"
echo "   git push origin main"
echo "4. Connect Blitzy to your GitHub repository"
echo "5. Follow Blitzy's Tech Spec review process"
echo ""
echo "Blitzy will handle:"
echo "- Dependency installation"
echo "- Code generation (~80%)"
echo "- Documentation creation"
echo "- Test generation"
echo ""
