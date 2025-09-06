#!/bin/bash

# Quick push to PROACTIVA-US/Veria with PAT

echo "Quick push to PROACTIVA-US/Veria"
echo "================================"
echo ""
echo "This will push your 7 pending commits to the private PROACTIVA-US/Veria repository."
echo ""
echo "Please enter your PROACTIVA-US Personal Access Token"
echo "(It should start with ghp_ or github_pat_)"
echo ""
read -s -p "PAT: " GITHUB_PAT
echo ""
echo ""

# Set the remote URL with the token
echo "Setting remote URL with authentication..."
git remote set-url origin https://PROACTIVA-US:${GITHUB_PAT}@github.com/PROACTIVA-US/Veria.git

# Set correct user for this repo
git config user.name "PROACTIVA-US"
git config user.email "info@proactiva.us"

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
        echo "✅ SUCCESS! All commits pushed to GitHub!"
        echo ""
        
        # Remove token from URL for security
        echo "Removing token from remote URL for security..."
        git remote set-url origin https://github.com/PROACTIVA-US/Veria.git
        
        echo "Done! Your work is now safely on GitHub."
    else
        echo "❌ Push failed. Please check your permissions."
    fi
else
    echo "❌ Authentication failed. Please check your PAT has repo access."
    # Remove token from URL
    git remote set-url origin https://github.com/PROACTIVA-US/Veria.git
fi
