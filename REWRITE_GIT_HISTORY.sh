#!/bin/bash

# Sora Oracle v5.0 - Git History Rewrite Script
# This rewrites ALL commits to author "Sora <soraoracle@proton.me>"
# and removes "Replit" references from commit messages

echo "🔄 Rewriting git history for Sora Oracle v5.0..."
echo ""
echo "⚠️  WARNING: This rewrites ALL commits!"
echo "⚠️  Make sure you have a backup if needed."
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

# Step 1: Rewrite all commit authors
echo ""
echo "📝 Step 1: Rewriting all commit authors to Sora..."
git filter-branch --force --env-filter '
    export GIT_AUTHOR_NAME="Sora"
    export GIT_AUTHOR_EMAIL="soraoracle@proton.me"
    export GIT_COMMITTER_NAME="Sora"
    export GIT_COMMITTER_EMAIL="soraoracle@proton.me"
' --tag-name-filter cat -- --branches --tags

# Step 2: Clean commit messages (remove Replit references)
echo ""
echo "🧹 Step 2: Cleaning commit messages..."
git filter-branch --force --msg-filter '
    sed "s/Replit Agent/Sora/g" | 
    sed "s/Replit/Sora/g" |
    sed "s/replit/sora/g"
' --tag-name-filter cat -- --branches --tags

# Step 3: Clean up refs
echo ""
echo "🗑️  Step 3: Cleaning up backup refs..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Step 4: Force garbage collection
echo ""
echo "♻️  Step 4: Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 5: Update local git config
echo ""
echo "⚙️  Step 5: Updating local git config..."
git config user.name "Sora"
git config user.email "soraoracle@proton.me"

echo ""
echo "✅ Git history rewritten successfully!"
echo ""
echo "📊 Verify changes:"
echo "   git log --oneline | head -10"
echo "   git log --format='%an <%ae>' | head -5"
echo ""
echo "🚀 To push (FORCE required for rewritten history):"
echo "   git push --force origin main"
echo ""
echo "⚠️  NOTE: Anyone who has cloned this repo will need to:"
echo "   git fetch origin"
echo "   git reset --hard origin/main"
echo ""
