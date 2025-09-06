#!/bin/bash

# Script to merge Veria-Platform bundles into the main Veria project
# Run AFTER cleanup-pm-stuff.sh

echo "🔀 Merging Veria-Platform bundles into main project..."
echo ""

SOURCE="/Users/danielconnolly/Projects/Veria-Platform/Veria-Platform"
DEST="/Users/danielconnolly/Projects/Veria"

# Check if source exists
if [ ! -d "$SOURCE" ]; then
    echo "❌ Source directory not found: $SOURCE"
    exit 1
fi

echo "📦 Moving bundle directories..."

# Move each bundle to the packages directory
for bundle in "$SOURCE"/veria-bundle-*; do
    if [ -d "$bundle" ]; then
        bundle_name=$(basename "$bundle")
        echo "  Moving $bundle_name to packages/"
        
        # Create packages directory if it doesn't exist
        mkdir -p "$DEST/packages"
        
        # Move the bundle
        mv "$bundle" "$DEST/packages/$bundle_name"
        echo "  ✅ Moved $bundle_name"
    fi
done

echo ""
echo "🧹 Cleaning up nested Veria-Platform directory..."

# Remove the now-empty nested directory
if [ -d "/Users/danielconnolly/Projects/Veria-Platform/Veria-Platform" ]; then
    rmdir "/Users/danielconnolly/Projects/Veria-Platform/Veria-Platform" 2>/dev/null || \
    echo "  Directory not empty, keeping it"
fi

# Remove the flatten scripts as they're no longer needed
rm -f /Users/danielconnolly/Projects/Veria-Platform/*.sh 2>/dev/null

echo ""
echo "✅ Merge complete!"
echo ""
echo "📊 New structure in $DEST/packages/:"
ls -la "$DEST/packages/" | grep veria-bundle

echo ""
echo "💡 Next steps:"
echo "1. cd $DEST"
echo "2. Review the merged structure"
echo "3. Update package.json if needed to include new workspaces"
echo "4. Run 'pnpm install' to link everything"
echo "5. Commit: git add . && git commit -m 'Merged bundle structure'"
