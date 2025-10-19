# 🔍 How to Verify Your Contract on BSCScan

## Why Verify?

Right now, BSCScan only shows your contract's **bytecode** (compiled machine code). After verification, it will show:
- ✅ Your actual Solidity source code
- ✅ All functions and their documentation
- ✅ Green checkmark "Verified" badge
- ✅ Users can read and interact with your contract directly

---

## Step 1: Get a FREE BSCScan API Key

### 1. Visit BSCScan
Go to: https://bscscan.com/register

### 2. Create Account
- Enter email
- Choose username and password
- Verify email

### 3. Get API Key
1. Login to BSCScan
2. Go to: https://bscscan.com/myapikey
3. Click **"Add"** to create new API key
4. Give it a name (e.g., "Sora Oracle")
5. Copy your API key

**Note:** The same API key works for both testnet and mainnet!

---

## Step 2: Add API Key to .env

```bash
# Open .env and add this line:
BSCSCAN_API_KEY=YourAPIKeyHere
```

Your `.env` should look like:
```bash
PRIVATE_KEY=0x9d5a5f905f45a6866071b2933e1245de0a125080774c3f982c9c97f61aebde66
ORACLE_PROVIDER_ADDRESS=
SORA_ORACLE_ADDRESS=0xA215e1bE0a679a6F74239A590dC6842558954e1a
BSCSCAN_API_KEY=YourAPIKeyHere
```

---

## Step 3: Verify Your Contract

Run this command:

```bash
npx hardhat verify --network bscTestnet \
  0xA215e1bE0a679a6F74239A590dC6842558954e1a \
  0x29ecD8FA7D7249e791B2563f83De4c124e639B90
```

**Arguments Explained:**
- First address: Your oracle contract
- Second address: Oracle provider (your wallet address)

---

## What You'll See

```
Successfully submitted source code for contract
contracts/SoraOracle.sol:SoraOracle at 0xA215e1bE0a679a6F74239A590dC6842558954e1a
for verification on the block explorer. Waiting for verification result...

Successfully verified contract SoraOracle on the block explorer.
https://testnet.bscscan.com/address/0xA215e1bE0a679a6F74239A590dC6842558954e1a#code
```

---

## After Verification

Visit your contract on BSCScan:
https://testnet.bscscan.com/address/0xA215e1bE0a679a6F74239A590dC6842558954e1a

You'll see:
1. **Code** tab - Your Solidity source code ✅
2. **Read Contract** tab - All view functions
3. **Write Contract** tab - All write functions
4. Green "Verified" checkmark

---

## Verify SimplePredictionMarket Too

```bash
npx hardhat verify --network bscTestnet \
  0x75c0794357966E4fF3A725CcFa5984eF87D86AF5 \
  0xA215e1bE0a679a6F74239A590dC6842558954e1a
```

---

## Quick Summary

1. Get API key: https://bscscan.com/myapikey
2. Add to .env: `BSCSCAN_API_KEY=YourKey`
3. Run verify command (see above)
4. Check BSCScan - your source code will appear!

**That's it!** 🎉
