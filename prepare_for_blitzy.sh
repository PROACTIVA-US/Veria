#!/bin/bash

# Veria Blitzy Handoff Preparation Script
# This script cleans up the Veria repo for Blitzy handoff

echo "======================================"
echo "Preparing Veria for Blitzy Handoff"
echo "======================================"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo "Checking prerequisites..."
if ! command_exists git; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

if ! command_exists pnpm; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    echo "   Run: npm install -g pnpm"
    exit 1
fi

echo "✅ Prerequisites met"
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

echo ""

# Step 2: Ensure git is clean
echo "Step 2: Checking git status..."
echo "-------------------------------"

# Check if it's a git repository
if [ ! -d .git ]; then
    echo "⚠️  Not a git repository. Initializing..."
    git init
    git add .
    git commit -m "Initial commit for Blitzy handoff"
    echo "✅ Git repository initialized"
else
    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        echo "⚠️  Uncommitted changes detected. Committing..."
        git add .
        git commit -m "Prepare for Blitzy handoff - cleanup and documentation"
        echo "✅ Changes committed"
    else
        echo "✅ Git repository is clean"
    fi
fi

echo ""

# Step 3: Validate package.json files
echo "Step 3: Validating package.json files..."
echo "-----------------------------------------"

# Function to validate JSON
validate_json() {
    if command_exists python3; then
        python3 -m json.tool "$1" > /dev/null 2>&1
        return $?
    elif command_exists node; then
        node -e "JSON.parse(require('fs').readFileSync('$1'))" > /dev/null 2>&1
        return $?
    else
        return 0  # Skip validation if no tools available
    fi
}

# Find and validate all package.json files
package_count=0
invalid_count=0
for pkg in $(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.worktrees/*" 2>/dev/null); do
    package_count=$((package_count + 1))
    if ! validate_json "$pkg"; then
        echo "❌ Invalid JSON in: $pkg"
        invalid_count=$((invalid_count + 1))
    fi
done

echo "Found $package_count package.json files"
if [ $invalid_count -eq 0 ]; then
    echo "✅ All package.json files are valid"
else
    echo "⚠️  $invalid_count invalid package.json files found. Please fix before handoff."
fi

echo ""

# Step 4: Generate Blitzy-specific files
echo "Step 4: Checking Blitzy-specific files..."
echo "------------------------------------------"

if [ -f "BLITZY_HANDOFF_README.md" ]; then
    echo "✅ BLITZY_HANDOFF_README.md exists"
else
    echo "❌ BLITZY_HANDOFF_README.md missing"
fi

if [ -f "Claude-prompt-veria-frontend.md" ]; then
    echo "✅ Claude-prompt-veria-frontend.md exists"
else
    echo "⚠️  Claude-prompt-veria-frontend.md missing"
fi

if [ -f ".cursorignore" ]; then
    echo "✅ .cursorignore exists"
else
    echo "⚠️  .cursorignore missing"
fi

echo ""

# Step 5: Check monorepo structure
echo "Step 5: Validating monorepo structure..."
echo "-----------------------------------------"

required_dirs=("apps" "services" "packages")
missing_dirs=()

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ /$dir directory exists"
    else
        echo "❌ /$dir directory missing"
        missing_dirs+=("$dir")
    fi
done

if [ ${#missing_dirs[@]} -eq 0 ]; then
    echo "✅ Monorepo structure is valid"
else
    echo "⚠️  Missing directories: ${missing_dirs[*]}"
fi

echo ""

# Step 6: Summary
echo "======================================"
echo "Handoff Preparation Summary"
echo "======================================"
echo ""

echo "📁 Repository: /Users/danielconnolly/Projects/Veria"
echo "📝 Package.json files: $package_count"
echo "🔧 Tech Stack: TypeScript, Node.js, Next.js, React"
echo "📦 Package Manager: pnpm (monorepo)"
echo ""

echo "Next Steps for Blitzy Handoff:"
echo "------------------------------"
echo "1. Push to GitHub:"
echo "   git remote add origin [your-github-url]"
echo "   git push -u origin main"
echo ""
echo "2. In Blitzy Platform:"
echo "   - Connect your GitHub repository"
echo "   - Review the auto-generated Tech Spec"
echo "   - Use the prompt template in BLITZY_HANDOFF_README.md"
echo ""
echo "3. Blitzy will:"
echo "   - Map your codebase structure"
echo "   - Generate comprehensive documentation"
echo "   - Build ~80% of requested features"
echo "   - Provide human engineering task list"
echo ""

echo "✅ Repository is ready for Blitzy handoff!"
echo ""
echo "For support, refer to: BLITZY_HANDOFF_README.md"
