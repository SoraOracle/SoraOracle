#!/bin/bash

echo "🧹 Clean Recent Replit Auto-Commits"
echo "===================================="
echo ""
echo "This removes Replit metadata from the last N commits"
echo ""
read -p "How many recent commits to clean? (1-10): " num_commits

if ! [[ "$num_commits" =~ ^[0-9]+$ ]] || [ "$num_commits" -lt 1 ] || [ "$num_commits" -gt 10 ]; then
    echo "Invalid number. Must be 1-10."
    exit 1
fi

echo ""
echo "🔧 Cleaning last $num_commits commit(s)..."

# Get the commit before the range we want to clean
BASE_COMMIT=$(git rev-parse HEAD~$num_commits)

# Filter the recent commits
git filter-branch -f --msg-filter 'sed -e "/^Replit-Commit-Author:/d" -e "/^Replit-Commit-Session-Id:/d" -e "/^Replit-Commit-Checkpoint-Type:/d" -e "/^$/N;/^\n$/D"' $BASE_COMMIT..HEAD

# Also ensure author is correct
git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_NAME" != "Sora" ] || [ "$GIT_AUTHOR_EMAIL" != "soraoracle@proton.me" ]; then
    export GIT_AUTHOR_NAME="Sora"
    export GIT_AUTHOR_EMAIL="soraoracle@proton.me"
fi
if [ "$GIT_COMMITTER_NAME" != "Sora" ] || [ "$GIT_COMMITTER_EMAIL" != "soraoracle@proton.me" ]; then
    export GIT_COMMITTER_NAME="Sora"
    export GIT_COMMITTER_EMAIL="soraoracle@proton.me"
fi
' $BASE_COMMIT..HEAD

echo ""
echo "✅ Cleaned!"
echo ""
echo "🚀 Force push to GitHub:"
echo "   git push origin main --force"
echo ""
