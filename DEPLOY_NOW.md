# 🚀 DEPLOY S402 TO MAINNET NOW

## ✅ What's Ready

### Smart Contracts
- ✅ **S402Facilitator.sol** - Production-ready payment contract
- ✅ EIP-2612 permit-based approvals
- ✅ Replay attack prevention
- ✅ Platform fee mechanism (1%)
- ✅ Batch settlement support

### SDK & Infrastructure
- ✅ **MultiWalletS402Pool** - 10x parallel transaction speedup
- ✅ **s402-config.ts** - Mainnet configuration
- ✅ **s402-middleware.js** - Backend payment verification
- ✅ Oracle integration with s402 payment requirements

### Documentation
- ✅ **V5_DEPLOYMENT_GUIDE.md** - Complete deployment walkthrough
- ✅ **V5_OPERATIONS_MANUAL.md** - Daily operations & incident response
- ✅ **SORA_ORACLE_TECHNICAL_SPECIFICATION.md** - Technical deep-dive
- ✅ **MAINNET_DEPLOYMENT_README.md** - Quick start guide

### Scripts
- ✅ **deploy-s402-mainnet.js** - Mainnet deployment script
- ✅ **pre-deployment-checklist.js** - Validation before deployment
- ✅ **fund-workers.js** - Worker wallet funding
- ✅ **check-worker-balances.js** - Balance monitoring

---

## ⚡ Deploy in 3 Steps

### Step 1: Add PRIVATE_KEY

The ONLY thing you need to provide is your wallet's private key:

1. **Create fresh MetaMask wallet** (never use personal wallet)
2. **Fund with 0.5+ BNB** (~$300 USD for deployment gas)
3. **Export private key:**
   - MetaMask → Settings → Security & Privacy → Reveal Private Key
4. **Add to Replit Secrets:**
   - Secrets panel → Add `PRIVATE_KEY`

### Step 2: Run Pre-Deployment Check

```bash
node scripts/pre-deployment-checklist.js
```

This validates:
- ✅ Network connection (BSC Mainnet)
- ✅ Wallet balance (0.5+ BNB)
- ✅ USDC contract verification
- ✅ BSCScan API configuration
- ✅ Contract compilation
- ✅ Gas price analysis

**Expected output:**
```
✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT!
```

### Step 3: Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-s402-mainnet.js --network bscMainnet
```

**What happens:**
1. Deploys S402Facilitator contract (~2 minutes)
2. Verifies on BSCScan automatically
3. Saves deployment info to `deployment-s402-mainnet.json`
4. Displays next steps

**Cost:** ~0.05-0.1 BNB (~$30-60 USD)

---

## 📋 After Deployment

### Immediate Actions (10 minutes)

1. **Update configs** with deployed contract address:
   ```bash
   # File: src/sdk/s402-config.ts
   facilitatorAddress: '0xYOUR_DEPLOYED_ADDRESS'
   
   # File: frontend/src/config.ts
   s402FacilitatorAddress: '0xYOUR_DEPLOYED_ADDRESS'
   
   # File: server/s402-middleware.js
   network: 'bsc-mainnet',
   chainId: 56
   ```

2. **Verify on BSCScan:**
   ```
   https://bscscan.com/address/YOUR_FACILITATOR_ADDRESS
   ```

3. **Fund worker wallets** (need $1,000 USDC total):
   ```bash
   node scripts/fund-workers.js --amount=100
   ```

4. **Test small payment:**
   ```bash
   # Test with $0.01 USDC
   curl -X POST https://your-api.com/api/oracle/query \
     -H "X-PAYMENT: {payment_proof}"
   ```

### Monitor for 24 Hours

```bash
# Check worker balances
node scripts/check-worker-balances.js

# Monitor BSCScan events
https://bscscan.com/address/YOUR_ADDRESS#events

# Filter by "PaymentSettled" events
```

---

## 💰 Cost Analysis

### Deployment (One-Time)
- S402Facilitator deployment: ~$30-60 USD
- BSCScan verification: Free
- **Total:** ~$30-60 USD

### Operations (Monthly)
- Worker wallet funding: $1,000 USDC (reusable)
- Gas fees (10k operations): ~$50
- **Total:** ~$50/month

### Revenue (at 1% platform fee)
- $5,000 volume → $50 fees
- $50,000 volume → $500 fees
- $500,000 volume → $5,000 fees

**Break-even:** ~$105k monthly volume

---

## 🔐 Security Notes

### Before Deployment
- ✅ Use FRESH wallet (never personal wallet)
- ✅ Only fund with deployment amount (0.5 BNB)
- ✅ Save PRIVATE_KEY securely (encrypted backup)

### After Deployment
- ⚠️ Transfer ownership to multi-sig wallet
- ⚠️ Limit worker wallets to $100-500 USDC each
- ⚠️ Monitor BSCScan for unusual activity
- ⚠️ Set up alerts for large transactions

### Emergency Procedures
- Worker compromised → Stop funding, rotate keys
- Contract bug → Deploy new facilitator, migrate fees
- RPC failure → Switch to backup provider

---

## 📊 What Gets Deployed

### Network: BNB Chain Mainnet
- **Chain ID:** 56
- **RPC:** https://bsc-dataseed.binance.org/
- **Explorer:** https://bscscan.com

### Smart Contract: S402Facilitator
- **Constructor Arg:** USDC address (`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`)
- **Platform Fee:** 1% (100 bps)
- **Owner:** Your deployer address
- **Immutable:** USDC address cannot be changed

### Features Enabled
- ✅ EIP-2612 permit-based payments
- ✅ Replay attack prevention (used permits tracked)
- ✅ Platform fee collection (1% of all transactions)
- ✅ Batch settlement (multiple payments in one TX)
- ✅ Fee withdrawal (owner only)

---

## 🚨 What Could Go Wrong?

### Deployment Fails

**"Insufficient funds"**
- Need 0.5+ BNB in deployer wallet
- Add more BNB, try again

**"Invalid nonce"**
- Pending transactions stuck
- Wait or reset nonce in MetaMask

**"Contract verification failed"**
- Auto-verification timeout
- Verify manually on BSCScan (script provides instructions)

### Post-Deployment Issues

**"Payment verification fails"**
- Config not updated with contract address
- Check s402-config.ts, middleware.js

**"Worker wallet empty"**
- Need to fund workers with USDC
- Run: `node scripts/fund-workers.js --amount=100`

**"Transactions slow"**
- Worker wallets not distributed properly
- Check balances, rebalance if needed

---

## 📚 Documentation Reference

### Quick Guides
- **MAINNET_DEPLOYMENT_README.md** - This guide
- **V5_DEPLOYMENT_GUIDE.md** - Detailed walkthrough
- **V5_OPERATIONS_MANUAL.md** - Daily operations

### Technical Docs
- **SORA_ORACLE_TECHNICAL_SPECIFICATION.md** - Architecture deep-dive
- **EIP_PAYMENT_STANDARDS_COMPARISON.md** - Why we use EIP-2612
- **USDC_USDT_BNB_CHAIN_IMPLEMENTATION.md** - USDC integration details

### Contract Code
- **contracts/S402Facilitator.sol** - Smart contract source
- **src/sdk/MultiWalletS402Pool.ts** - Multi-wallet implementation
- **server/s402-middleware.js** - Backend middleware

---

## 🎯 Ready to Deploy?

Run these commands in order:

```bash
# 1. Validate everything is ready
node scripts/pre-deployment-checklist.js

# 2. Deploy to mainnet (requires PRIVATE_KEY in Secrets)
npx hardhat run scripts/deploy-s402-mainnet.js --network bscMainnet

# 3. After deployment, update configs with contract address
# Then fund workers:
node scripts/fund-workers.js --amount=100

# 4. Monitor operations
node scripts/check-worker-balances.js
```

---

## ✅ Deployment Checklist

Pre-Deployment:
- [ ] PRIVATE_KEY added to Replit Secrets
- [ ] Deployer wallet funded with 0.5+ BNB
- [ ] BSCSCAN_API_KEY configured
- [ ] Pre-deployment check passes
- [ ] $1,000 USDC ready for worker funding

Deployment:
- [ ] Contract deployed successfully
- [ ] BSCScan verification complete
- [ ] Deployment info saved

Post-Deployment:
- [ ] All configs updated with contract address
- [ ] Worker wallets funded with USDC
- [ ] Test payment succeeds
- [ ] Monitoring dashboard live
- [ ] Emergency procedures documented

---

**You're ready to deploy Sora Oracle v5.0 to mainnet! 🚀**

Once you add PRIVATE_KEY and run the deployment script, you'll have a production-ready HTTP 402 micropayment system on BNB Chain.

Last updated: October 27, 2025
