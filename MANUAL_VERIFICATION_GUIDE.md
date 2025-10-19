# 📝 Manual Contract Verification Guide

## Issue: BSCScan API V2 Migration

BSCScan is migrating to API V2, causing automated verification to fail. Don't worry - you can verify manually through their website!

---

## ✅ Manual Verification Steps

### Step 1: Get Your Flattened Contract

I've created a flattened version of your contract:
```
SoraOracle_flattened.sol
```

This combines all imports into a single file for verification.

### Step 2: Visit BSCScan Verification Page

Go to:
```
https://testnet.bscscan.com/verifyContract?a=0xA215e1bE0a679a6F74239A590dC6842558954e1a
```

Or manually:
1. Go to: https://testnet.bscscan.com/address/0xA215e1bE0a679a6F74239A590dC6842558954e1a
2. Click **"Contract"** tab
3. Click **"Verify and Publish"**

### Step 3: Fill in the Form

**Contract Address:**
```
0xA215e1bE0a679a6F74239A590dC6842558954e1a
```

**Compiler Type:**
- Select: **Solidity (Single file)**

**Compiler Version:**
- Select: **v0.8.20+commit.a1b79de6**

**Open Source License Type:**
- Select: **MIT License (MIT)**

**Optimization:**
- Select: **Yes**
- Runs: **200**

### Step 4: Enter Source Code

Copy the entire contents of `SoraOracle_flattened.sol` and paste into the "Enter the Solidity Contract Code below" field.

### Step 5: Constructor Arguments ABI-encoded

**Important!** You need the ABI-encoded constructor arguments.

Your constructor takes one address: `0x29ecD8FA7D7249e791B2563f83De4c124e639B90`

ABI-encoded value:
```
00000000000000000000000029ecd8fa7d7249e791b2563f83de4c124e639b90
```

Paste this in the **"Constructor Arguments ABI-encoded"** field.

### Step 6: Verify

1. Complete the CAPTCHA
2. Click **"Verify and Publish"**
3. Wait 10-30 seconds for verification

---

## 🎉 After Verification

Once successful, you'll see:

✅ **Green checkmark** on contract page  
✅ **Read Contract** tab with all functions  
✅ **Write Contract** tab to interact  
✅ **Source code** visible to everyone  

---

## Alternative: Wait for Hardhat Update

The Hardhat team will likely update the verification plugin to support BSCScan API V2 soon. You can try again in a few days with:

```bash
npx hardhat verify --network bscTestnet \
  0xA215e1bE0a679a6F74239A590dC6842558954e1a \
  0x29ecD8FA7D7249e791B2563f83De4c124e639B90
```

---

## Quick Links

**Your Contract:**
https://testnet.bscscan.com/address/0xA215e1bE0a679a6F74239A590dC6842558954e1a

**Verification Page:**
https://testnet.bscscan.com/verifyContract?a=0xA215e1bE0a679a6F74239A590dC6842558954e1a

**Flattened Contract:**
`SoraOracle_flattened.sol` (in your project)

---

## Need Help?

If verification fails, check:
1. Compiler version matches exactly (v0.8.20)
2. Optimization is set to Yes with 200 runs
3. Constructor arguments are correctly ABI-encoded
4. Full source code is pasted (no truncation)

The manual verification takes about 2 minutes!
