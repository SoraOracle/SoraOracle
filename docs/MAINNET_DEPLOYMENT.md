# 🚀 Mainnet Deployment Guide

**IMPORTANT:** You are deploying contracts that will handle real money. Review this entire guide carefully before proceeding.

## 📋 Pre-Deployment Checklist

### ✅ Security Review
- [ ] All 43 tests passing on testnet
- [ ] Contract verified on BSC testnet (0xA215e1bE0a679a6F74239A590dC6842558954e1a)
- [ ] Gas optimizations verified (84.9% savings confirmed)
- [ ] ReentrancyGuard on all payable functions
- [ ] Emergency pause mechanism tested
- [ ] Access control (onlyOwner, onlyOracleProvider) verified
- [ ] No hardcoded addresses (except PancakeSwap factory)
- [ ] Fee parameters are reasonable (0.01 BNB question fee, 0.02 BNB TWAP deployment)

### ✅ Environment Setup
- [ ] Private key for deployment wallet (needs ~0.5 BNB for deployment + gas)
- [ ] BSCScan API key configured for contract verification
- [ ] RPC endpoint configured (https://bsc-dataseed.binance.org/)
- [ ] Network selection verified: `--network bscMainnet`

### ✅ Cost Estimates
- **SoraOracle Contract:** ~0.15 BNB (~$90 at $600/BNB)
- **TWAP Oracle (per pair):** 0.02 BNB + gas (~0.025 BNB total)
- **3 Common Pairs:** 0.075 BNB additional
- **BSCScan Verification:** Free with API key
- **Total Estimated Cost:** ~0.25-0.3 BNB (~$150-180)

### ✅ Post-Deployment Preparation
- [ ] Have monitoring system ready
- [ ] Oracle provider wallet funded for answering questions
- [ ] Plan for TWAP oracle updates (5-min intervals)
- [ ] Marketing materials ready (website, docs, Twitter)

---

## 🔐 Step 1: Configure Environment

Create/update your `.env` file:

```bash
# Deployment wallet (needs ~0.5 BNB)
PRIVATE_KEY=your_mainnet_private_key_here

# Oracle provider address (can be same as deployer)
ORACLE_PROVIDER_ADDRESS=0xYourOracleProviderAddress

# BSCScan API key (for verification)
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

**CRITICAL:** Never commit your private key! The `.env` file is already in `.gitignore`.

---

## 🚀 Step 2: Deploy to Mainnet

### Test Configuration First
```bash
# Verify network config
npx hardhat run scripts/check-mainnet-config.js --network bscMainnet
```

### Deploy SoraOracle
```bash
# Deploy the main oracle contract
npx hardhat run scripts/deploy-mainnet.js --network bscMainnet
```

**Expected Output:**
```
🚀 Deploying Sora Oracle to BSC MAINNET...
⚠️  WARNING: REAL MONEY - DOUBLE CHECK EVERYTHING
Deploying with account: 0xYour...Address
Account balance: 0.5 BNB

📝 Deploying SoraOracle...
✅ SoraOracle deployed to: 0xYour...Mainnet...Address

📊 Setting up TWAP oracles for trading pairs...
✅ WBNB/BUSD TWAP oracle added
✅ WBNB/USDT TWAP oracle added
✅ CAKE/WBNB TWAP oracle added

🎉 Deployment Complete!
Total gas spent: ~0.25 BNB
```

### Save Contract Address
```bash
# Add to .env
echo "SORA_ORACLE_ADDRESS=0xYourMainnetAddress" >> .env
```

---

## ✅ Step 3: Verify on BSCScan

### Automatic Verification
```bash
npx hardhat verify --network bscMainnet 0xYourMainnetAddress "0xOracleProviderAddress"
```

### Manual Verification (if automatic fails)
1. Go to https://bscscan.com/verifyContract
2. Enter contract address
3. Select:
   - Compiler: v0.8.20+commit.a1b79de6
   - Optimization: Yes (200 runs)
   - License: MIT
4. Paste flattened source code:
   ```bash
   npx hardhat flatten contracts/SoraOracle.sol > flattened.sol
   ```
5. Submit and wait for verification

---

## 🧪 Step 4: Post-Deployment Testing

### Test Basic Functions
```bash
# Check contract is accessible
npm run mainnet:status

# Ask a test question (costs 0.01 BNB)
npm run mainnet:test-question

# Check TWAP oracles are active
npm run mainnet:check-twap
```

### Verify On-Chain
1. **View on BSCScan:** https://bscscan.com/address/0xYourMainnetAddress
2. **Check contract code is verified** (green checkmark)
3. **Read contract functions** work without errors
4. **Check initial state:**
   - `oracleFee` = 10000000000000000 (0.01 BNB)
   - `oracleProvider` = your provider address
   - `questionCounter` = 0

---

## 📊 Step 5: Start Monitoring & Operations

### Start Auto-Updater (for TWAP oracles)
```bash
# Run TWAP price updates every 5 minutes
npm run mainnet:auto-update
```

### Monitor Events
```bash
# Watch for new questions
npm run mainnet:watch-questions

# Watch for new answers
npm run mainnet:watch-answers
```

### Fund Oracle Provider
```bash
# Provider needs BNB for gas when answering questions
# Recommended: Keep 0.1 BNB minimum balance
```

---

## 🛡️ Security Best Practices

### Immediate Actions
1. **Transfer ownership** to multisig (if using): `transferOwnership(multisigAddress)`
2. **Test pause mechanism**: `pause()` then `unpause()`
3. **Verify provider rewards**: Answer a test question and withdraw
4. **Monitor gas prices**: Set up alerts for abnormal gas usage

### Ongoing Operations
- Monitor all QuestionAsked events
- Answer questions within the deadline
- Update TWAP oracles every 5 minutes minimum
- Keep provider wallet funded
- Regular security audits (quarterly recommended)

### Emergency Procedures
If you need to pause the contract:
```bash
# Pause all operations
npm run mainnet:pause

# After fixing issue, unpause
npm run mainnet:unpause
```

---

## 📝 Update Documentation

After successful deployment:

1. **Update README.md:**
   ```markdown
   [![BSC Mainnet](https://img.shields.io/badge/BSC-Mainnet%20Live-green.svg)](https://bscscan.com/address/0xYourMainnetAddress#code)
   ```

2. **Update replit.md:**
   - Add mainnet address
   - Update deployment date
   - Note any changes from testnet

3. **Announce on social media:**
   - Twitter/X: @soraoracle
   - Website: soraoracle.com
   - Docs: soraoracle.com/documentation

---

## 💰 Cost Summary

| Item | Estimated Cost | Purpose |
|------|---------------|---------|
| SoraOracle deployment | ~0.15 BNB | Main oracle contract |
| WBNB/BUSD TWAP | ~0.025 BNB | Price feed setup |
| WBNB/USDT TWAP | ~0.025 BNB | Price feed setup |
| CAKE/WBNB TWAP | ~0.025 BNB | Price feed setup |
| **Total** | **~0.225 BNB** | **$135-180 depending on BNB price** |

**Note:** Always keep extra BNB for gas fluctuations. Recommended: 0.5 BNB total.

---

## ⚠️ Common Issues

### "Insufficient funds"
- Check deployer wallet has at least 0.5 BNB
- Gas prices may spike, wait and retry

### "Contract verification failed"
- Ensure exact compiler settings match (0.8.20, 200 runs)
- Use flattened source code
- Check constructor arguments match

### "TWAP oracle deployment failed"
- Check pair addresses are correct mainnet addresses
- Ensure sufficient value sent (0.02 BNB per oracle)
- PancakeSwap pair must exist and have liquidity

### "Transaction underpriced"
- BSC mainnet gas prices fluctuate
- Increase gasPrice in hardhat.config.js
- Current typical: 3-5 Gwei

---

## 🎉 Success Criteria

Your mainnet deployment is successful when:

✅ SoraOracle contract deployed and verified on BSCScan  
✅ All 3 TWAP oracles created for common pairs  
✅ Contract verification shows green checkmark  
✅ Test question asked and answered successfully  
✅ TWAP prices updating every 5+ minutes  
✅ README updated with mainnet badge and address  
✅ Monitoring and auto-updater running  
✅ Oracle provider wallet funded and operational  

---

## 📞 Need Help?

- **Documentation:** https://soraoracle.com/documentation
- **Twitter/X:** [@soraoracle](https://x.com/soraoracle)
- **GitHub Issues:** Report bugs or ask questions
- **BSC Discord:** Community support for BSC-specific issues

---

**Remember:** You're deploying contracts that handle real money. Take your time, double-check everything, and test thoroughly before announcing to users!
