#!/bin/bash

echo "📝 Creating verification request..."

# Read the flattened contract
SOURCE_CODE=$(cat S402_flattened.sol)

# URL encode the source code
SOURCE_CODE_ENCODED=$(node -e "console.log(encodeURIComponent(require('fs').readFileSync('S402_flattened.sol', 'utf8')))")

echo "🔍 Submitting to BSCScan API (bypassing version check)..."

# Try direct API call with all necessary parameters
curl -X POST "https://api.bscscan.com/api" \
  --data-urlencode "apikey=${BSCSCAN_API_KEY}" \
  --data-urlencode "module=contract" \
  --data-urlencode "action=verifysourcecode" \
  --data-urlencode "contractaddress=0xb1508fD3ADa2DE134b3a3A231c94951BAFc0fF12" \
  --data-urlencode "sourceCode@S402_flattened.sol" \
  --data-urlencode "codeformat=solidity-single-file" \
  --data-urlencode "contractname=S402Facilitator" \
  --data-urlencode "compilerversion=v0.8.20+commit.a1b79de6" \
  --data-urlencode "optimizationUsed=1" \
  --data-urlencode "runs=200" \
  --data-urlencode "constructorArguements=0000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d" \
  --data-urlencode "evmversion=paris" \
  --data-urlencode "licenseType=3" \
  2>&1 | jq '.' || cat
