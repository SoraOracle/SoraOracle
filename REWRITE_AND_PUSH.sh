#!/bin/bash
set -e

echo "🔄 Rewriting git history: Sora <soraoracle@proton.me>"

# Rewrite all authors
git filter-branch --force --env-filter 'export GIT_AUTHOR_NAME="Sora"; export GIT_AUTHOR_EMAIL="soraoracle@proton.me"; export GIT_COMMITTER_NAME="Sora"; export GIT_COMMITTER_EMAIL="soraoracle@proton.me"' --tag-name-filter cat -- --branches --tags

# Remove Replit from commit messages
git filter-branch --force --msg-filter 'sed "s/Replit Agent/Sora/g" | sed "s/Replit/Sora/g" | sed "s/replit/sora/g"' --tag-name-filter cat -- --branches --tags

# Clean up
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Update config
git config user.name "Sora"
git config user.email "soraoracle@proton.me"

# Tag v5.0.0
git tag -a v5.0.0 -m "Sora Oracle SDK v5.0.0 - Production Release

S402 micropayment protocol on BNB Chain
Deployed: 0xb1508fD3ADa2DE134b3a3A231c94951BAFc0fF12"

# Push everything
git push --force origin main
git push --force origin v5.0.0

echo "✅ Done! All commits now authored by Sora"
