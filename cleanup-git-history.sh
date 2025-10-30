#!/bin/bash

# Git History Cleanup Script for Sora Oracle
# This script removes Replit metadata from commits and sets Sora as the author
# WARNING: This rewrites git history. Make sure you have backups!

set -e  # Exit on error

echo "🔧 Git History Cleanup Script"
echo "================================"
echo ""
echo "⚠️  WARNING: This will rewrite your entire git history!"
echo "⚠️  Make sure you have backups before proceeding."
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

# Step 1: Create backup branch
echo ""
echo "📦 Creating backup branch..."
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || echo "Backup branch already exists"

# Step 2: Set Sora as global git author
echo ""
echo "👤 Setting Sora as global author..."
git config user.name "Sora"
git config user.email "sora@soraoracle.io"

# Step 3: Remove any currently tracked Replit files
echo ""
echo "🧹 Removing tracked Replit files from index..."
git rm -r --cached .replit .replit.* replit.nix .config .upm .cache .breakpoints 2>/dev/null || true
git rm --cached replit_zip_error_log.txt .replitignore 2>/dev/null || true

# Step 4: Rewrite commit history
echo ""
echo "✨ Rewriting commit history..."
echo "   - Changing all authors to Sora"
echo "   - Removing Replit metadata from commit messages"
echo ""

# Using git filter-branch (works everywhere)
git filter-branch -f --env-filter '
    export GIT_AUTHOR_NAME="Sora"
    export GIT_AUTHOR_EMAIL="sora@soraoracle.io"
    export GIT_COMMITTER_NAME="Sora"
    export GIT_COMMITTER_EMAIL="sora@soraoracle.io"
' --msg-filter '
    # Remove Co-authored-by lines
    sed "/^Co-authored-by:/d" | \
    # Remove Replit-related metadata
    sed "/^Signed-off-by: Replit/d" | \
    sed "/replit\.com/d" | \
    sed "/This commit was made from Replit/d" | \
    # Remove empty lines at the end
    sed -e :a -e "/^\n*$/{$d;N;ba" -e "}"
' --tag-name-filter cat -- --branches --tags

# Step 5: Clean up refs
echo ""
echo "🧹 Cleaning up refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 6: Commit the .gitignore changes
echo ""
echo "📝 Committing updated .gitignore..."
git add .gitignore
git commit -m "chore: update .gitignore to exclude Replit metadata" --author="Sora <sora@soraoracle.io>" 2>/dev/null || echo "Nothing to commit"

echo ""
echo "✅ Git history cleanup complete!"
echo ""
echo "📊 Summary:"
git log --oneline --all --graph -10
echo ""
echo "👤 All commits now authored by: $(git config user.name) <$(git config user.email)>"
echo ""
echo "⚠️  To push these changes to remote (DESTRUCTIVE):"
echo "    git push --force origin main"
echo ""
echo "💡 To restore from backup if needed:"
echo "    git checkout backup-before-cleanup-YYYYMMDD-HHMMSS"
