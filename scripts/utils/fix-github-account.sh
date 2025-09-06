#!/bin/bash

# Fix Veria to use PROACTIVA-US account

echo "Configuring Veria to use PROACTIVA-US GitHub account..."

cd /Users/danielconnolly/Projects/Veria

# Set local git config for this repository
git config user.name "PROACTIVA-US"
git config user.email "info@proactiva.us"

# Add a git attribute to mark this as a PROACTIVA project
echo "# GitHub Account: PROACTIVA-US" > .github-account

echo "✅ Veria configured to use PROACTIVA-US"
echo ""
echo "Current configuration:"
echo "User: $(git config user.name)"
echo "Email: $(git config user.email)"
