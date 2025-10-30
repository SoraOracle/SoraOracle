#!/bin/bash
set -e

echo "🔧 Cleaning Git History from Replit Metadata"
echo "============================================="
echo ""

# Step 1: Create backup
echo "📦 Creating backup branch..."
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || echo "Backup exists"

# Step 2: Remove the latest .gitignore commit
echo ""
echo "🗑️  Removing latest commit..."
git reset --hard HEAD~1

# Step 3: Set Sora as author
echo ""
echo "👤 Setting Sora as git author..."
git config user.name "Sora"
git config user.email "sora@soraoracle.io"

# Step 4: Rewrite ALL history to remove Replit metadata and change authors
echo ""
echo "✨ Rewriting commit history (this may take a minute)..."
git filter-branch -f --env-filter '
    export GIT_AUTHOR_NAME="Sora"
    export GIT_AUTHOR_EMAIL="sora@soraoracle.io"
    export GIT_COMMITTER_NAME="Sora"
    export GIT_COMMITTER_EMAIL="sora@soraoracle.io"
' --msg-filter '
    sed "/^Co-authored-by:/d" | \
    sed "/^Signed-off-by:/d" | \
    sed "/^Replit-Commit-Author:/d" | \
    sed "/^Replit-Commit-Session-Id:/d" | \
    sed "/^Replit-Commit-Checkpoint-Type:/d" | \
    sed "/^Replit-Commit-Event-Id:/d" | \
    sed "/^Replit-Commit-Screenshot-Url/d" | \
    sed "/replit\.com/d" | \
    sed -e :a -e "/^\n*$/{\$d;N;ba" -e "}"
' --tag-name-filter cat -- --branches --tags

# Step 5: Clean up
echo ""
echo "🧹 Cleaning up git refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 6: Add .gitignore changes and commit as Sora
echo ""
echo "📝 Creating new commit for .gitignore..."
git add .gitignore
git commit -m "chore: update .gitignore to exclude Replit metadata

Updated by SORA and s402 to prevent future Replit metadata commits." --author="Sora <sora@soraoracle.io>"

echo ""
echo "✅ Complete! Here are your last 10 commits:"
echo ""
git log --oneline -10
echo ""
echo "👤 Verify all authors:"
git log --format="%an <%ae>" | sort -u
echo ""
echo "📋 View a commit body to verify Replit metadata is gone:"
git log -1 --format=full
echo ""
echo "🚀 To push to GitHub (DESTRUCTIVE):"
echo "   git push --force origin main"
