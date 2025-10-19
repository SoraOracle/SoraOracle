#!/bin/bash

echo "🧹 Removing Replit metadata from commit 06b6cd0"
echo "==============================================="
echo ""
echo "Current commit message contains:"
echo "  - Replit-Commit-Author: Agent"
echo ""
echo "Will create clean commit with:"
echo "  Author: Sora <soraoracle@proton.me>"
echo "  Message: Update project documentation to include mainnet test report and status"
echo "  (No Replit metadata)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "🔧 Amending commit to remove Replit metadata..."

# Get current commit details
COMMIT_DATE=$(git log -1 --format=%aD 06b6cd0)

# Reset to one before
git reset --soft 06b6cd0~1

# Create new commit with clean message and correct author
GIT_AUTHOR_NAME="Sora" \
GIT_AUTHOR_EMAIL="soraoracle@proton.me" \
GIT_COMMITTER_NAME="Sora" \
GIT_COMMITTER_EMAIL="soraoracle@proton.me" \
git commit -m "Update project documentation to include mainnet test report and status

Added mainnet test report link to README and updated project status documentation."

echo ""
echo "✅ Clean commit created!"
echo ""
echo "📊 Verification:"
git log -1 --pretty=format:"Author: %an <%ae>%nMessage:%n%B"

echo ""
echo ""
echo "🚀 Force push to GitHub:"
echo "   git push origin main --force"
echo ""
