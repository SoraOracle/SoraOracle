#!/bin/bash

echo "🔧 REMOVE COMMIT 31da880 & SET SORA FOR FUTURE"
echo "==============================================="
echo ""
echo "This will:"
echo "  1. Remove commit 31da880"
echo "  2. Set Git author to 'Sora' for all future commits"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "🔧 Step 1: Setting Git config to Sora..."
git config --local user.name "Sora"
git config --local user.email "soraoracle@proton.me"
echo "✅ Git config updated"

echo ""
echo "🔧 Step 2: Checking if 31da880 is HEAD..."
CURRENT_COMMIT=$(git rev-parse --short HEAD)

if [ "$CURRENT_COMMIT" = "31da880" ]; then
    echo "   Commit 31da880 is HEAD - removing..."
    git reset --hard HEAD~1
    echo "   ✅ Removed"
elif git cat-file -e 31da880^{commit} 2>/dev/null; then
    echo "   Found 31da880 in history - removing via rebase..."
    PARENT=$(git rev-parse 31da880^)
    git rebase --onto $PARENT 31da880
    echo "   ✅ Removed"
else
    echo "   ℹ️  Commit 31da880 not found"
fi

echo ""
echo "✅ DONE!"
echo ""
echo "📊 Git config verification:"
echo "   User: $(git config --local user.name)"
echo "   Email: $(git config --local user.email)"
echo ""
echo "📊 Last 3 commits:"
git log -3 --oneline
echo ""
echo "🚀 All future commits will be by: Sora <soraoracle@proton.me>"
echo ""
echo "Next: Force push to GitHub"
echo "   git push origin main --force"
echo ""
