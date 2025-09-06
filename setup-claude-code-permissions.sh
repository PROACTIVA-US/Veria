#!/bin/bash

# Script to ensure Claude Code has proper permissions for the Veria project
# This addresses the permission issues you're experiencing

echo "🔧 Setting up proper permissions for Claude Code..."
echo ""

PROJECT_DIR="/Users/danielconnolly/Projects/Veria"
PLATFORM_DIR="/Users/danielconnolly/Projects/Veria-Platform"

# Make sure directories exist and are accessible
echo "📁 Ensuring directory permissions..."

# Set proper permissions for the main project
if [ -d "$PROJECT_DIR" ]; then
    echo "  Setting permissions for $PROJECT_DIR"
    chmod -R u+rwX "$PROJECT_DIR"
    echo "  ✅ Veria permissions set"
fi

if [ -d "$PLATFORM_DIR" ]; then
    echo "  Setting permissions for $PLATFORM_DIR"
    chmod -R u+rwX "$PLATFORM_DIR"
    echo "  ✅ Veria-Platform permissions set"
fi

# Make all shell scripts executable
echo ""
echo "🔨 Making scripts executable..."
find "$PROJECT_DIR" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null
find "$PLATFORM_DIR" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null

# Create a Claude Code configuration file with proper settings
echo ""
echo "📝 Creating Claude Code configuration..."

cat > "$PROJECT_DIR/.claude-code-config.json" << 'EOF'
{
  "permissions": {
    "allowFileSystemWrite": true,
    "allowFileSystemMove": true,
    "allowScriptExecution": true,
    "workingDirectory": "/Users/danielconnolly/Projects/Veria"
  },
  "environment": {
    "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    "SHELL": "/bin/bash"
  },
  "suggestions": [
    "If file operations fail, try using Python scripts instead of bash",
    "Use git for file moves when possible: git mv source dest",
    "Break complex operations into smaller steps",
    "Always use absolute paths for reliability"
  ]
}
EOF

echo "  ✅ Configuration created at $PROJECT_DIR/.claude-code-config.json"

echo ""
echo "🐍 Creating Python helper script for file operations..."

cat > "$PROJECT_DIR/file-operations.py" << 'EOF'
#!/usr/bin/env python3
"""
Helper script for file operations that might be restricted in Claude Code.
Use this when bash commands fail.
"""

import os
import shutil
import sys
from pathlib import Path

def flatten_directory(source_dir, target_dir):
    """Flatten nested directory structure."""
    source = Path(source_dir)
    target = Path(target_dir)
    
    if not source.exists():
        print(f"❌ Source not found: {source}")
        return False
    
    print(f"📦 Flattening {source} to {target}")
    
    for item in source.rglob("*"):
        if item.is_file():
            relative = item.relative_to(source)
            dest = target / relative
            
            dest.parent.mkdir(parents=True, exist_ok=True)
            
            print(f"  Moving {relative}")
            shutil.move(str(item), str(dest))
    
    # Clean up empty directories
    for item in sorted(source.rglob("*"), reverse=True):
        if item.is_dir() and not any(item.iterdir()):
            item.rmdir()
            print(f"  Removed empty dir: {item}")
    
    return True

def reorganize_bundles():
    """Reorganize the Veria-Platform bundle structure."""
    base = Path("/Users/danielconnolly/Projects/Veria-Platform")
    nested = base / "Veria-Platform"
    
    if nested.exists():
        print("🔄 Reorganizing bundle structure...")
        
        for item in nested.iterdir():
            dest = base / item.name
            if not dest.exists():
                print(f"  Moving {item.name} to root")
                shutil.move(str(item), str(dest))
            else:
                print(f"  Skipping {item.name} (already exists)")
        
        # Remove nested directory if empty
        if not any(nested.iterdir()):
            nested.rmdir()
            print("  ✅ Removed empty nested directory")
    
    print("✅ Reorganization complete")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "flatten":
            flatten_directory(sys.argv[2], sys.argv[3])
        elif sys.argv[1] == "reorganize":
            reorganize_bundles()
    else:
        print("Usage:")
        print("  python file-operations.py flatten <source> <target>")
        print("  python file-operations.py reorganize")
EOF

chmod +x "$PROJECT_DIR/file-operations.py"
echo "  ✅ Python helper created at $PROJECT_DIR/file-operations.py"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 How to fix Claude Code permission issues:"
echo ""
echo "1. When bash commands fail, use the Python helper:"
echo "   python3 $PROJECT_DIR/file-operations.py reorganize"
echo ""
echo "2. Or have Claude Code generate Python code instead:"
echo "   Ask: 'Use Python to move these files instead of bash'"
echo ""
echo "3. For immediate fixes, run commands directly in your terminal:"
echo "   cd $PROJECT_DIR"
echo "   ./cleanup-pm-stuff.sh"
echo "   ./merge-bundles.sh"
echo ""
echo "4. If Claude Code still has issues:"
echo "   - Use 'git mv' for file moves"
echo "   - Break operations into smaller steps"
echo "   - Have Claude generate scripts for you to run manually"
