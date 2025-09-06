#!/bin/bash

# Push Veria commits to PROACTIVA-US/Veria

echo "================================"
echo "Push Veria to PROACTIVA-US"
echo "================================"
echo ""
echo "This will push your 7 pending commits to PROACTIVA-US/Veria"
echo ""

# Check current config
echo "Current Git configuration:"
echo "User: $(git config user.name)"
echo "Email: $(git config user.email)"
echo ""

# Use gh CLI if authenticated to PROACTIVA-US
echo "Checking gh CLI authentication..."
gh auth status 2>&1 | grep -q "PROACTIVA-US"
if [ $? -eq 0 ]; then
    echo "✅ Authenticated to PROACTIVA-US via gh CLI"
    git remote set-url origin https://github.com/PROACTIVA-US/Veria.git
    git push origin main
else
    echo "⚠️  Not authenticated to PROACTIVA-US in gh CLI"
    echo ""
    echo "Please enter your PROACTIVA-US Personal Access Token"
    echo "(starts with ghp_ or github_pat_)"
    echo ""
    read -s -p "PAT: " GITHUB_PAT
    echo ""
    echo ""
    
    # Set the remote URL with the token
    echo "Setting remote URL with authentication..."
    git remote set-url origin https://PROACTIVA-US:${GITHUB_PAT}@github.com/PROACTIVA-US/Veria.git
    
    # Test connection
    echo "Testing connection..."
    git ls-remote origin HEAD > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Authentication successful!"
        echo ""
        echo "Pushing 7 commits to GitHub..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ SUCCESS! All commits pushed to PROACTIVA-US/Veria!"
            echo ""
            
            # Remove token from URL for security
            echo "Removing token from remote URL for security..."
            git remote set-url origin https://github.com/PROACTIVA-US/Veria.git
            
            echo "Done! Your work is now safely on GitHub."
        else
            echo "❌ Push failed. Please check your permissions."
            git remote set-url origin https://github.com/PROACTIVA-US/Veria.git
        fi
    else
        echo "❌ Authentication failed. Please check your PAT."
        git remote set-url origin https://github.com/PROACTIVA-US/Veria.git
    fi
fi
