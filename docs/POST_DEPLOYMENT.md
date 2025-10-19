# ✅ Post-Deployment Verification & Operations

**After deploying to mainnet, follow these steps to ensure everything is working correctly and set up ongoing operations.**

---

## 📋 Immediate Post-Deployment Checklist

### 1. Verify Contract on BSCScan

**Automatic Verification:**
```bash
npx hardhat verify --network bscMainnet 0xYourContractAddress "0xYourProviderAddress"
```

**Check Verification:**
1. Go to https://bscscan.com/address/0xYourContractAddress
2. Look for green checkmark next to "Contract" tab
3. Click "Contract" → should see source code
4. Click "Read Contract" → functions should be accessible

**If automatic fails:**
- See MAINNET_DEPLOYMENT.md → Step 3 for manual verification
- Double-check compiler version (0.8.20) and runs (200)
- Use `npx hardhat flatten` to create single-file source

---

### 2. Verify Contract State

**Read Contract Values:**
```bash
npm run mainnet:status
```

**Expected output:**
```
✅ Contract verified at: 0xYourAddress
✅ Oracle Provider: 0xProviderAddress
✅ Oracle Fee: 0.01 BNB
✅ Question Counter: 0
✅ Contract is not paused
✅ Owner: 0xYourAddress
```

**Manual verification via BSCScan:**
1. Go to contract → "Read Contract"
2. Check:
   - `oracleFee` = 10000000000000000 (0.01 BNB)
   - `oracleProvider` = your provider address
   - `owner` = your deployer address
   - `paused` = false
   - `questionCounter` = 0

---

### 3. Test Basic Functionality

**Ask a Test Question (costs 0.01 BNB):**
```bash
npm run mainnet:test-question
```

This will:
- Ask a simple test question
- Verify transaction succeeds
- Return question ID
- Check question appears in events

**Answer the Test Question:**
```bash
npm run mainnet:answer -- --questionId 1 --answer "Test successful"
```

**Withdraw Provider Rewards:**
```bash
npm run mainnet:withdraw
```

---

### 4. Verify TWAP Oracles

**Check deployed TWAP oracles:**
```bash
npm run mainnet:check-twap
```

**Expected output:**
```
📊 TWAP Oracle Status:

WBNB/BUSD (0x58F8...):
  ✅ Oracle deployed
  ✅ Can consult: true
  📊 TWAP price: 612.45 BUSD
  📊 Spot price: 613.12 BUSD
  ⏱️  Last update: 2 minutes ago

WBNB/USDT (0x16b9...):
  ✅ Oracle deployed
  ✅ Can consult: true
  ...
```

**If canConsult = false:**
- Oracle is in bootstrap mode (first 5 minutes)
- Wait 5 minutes and check again
- This is normal for newly deployed oracles

**Update TWAP manually:**
```bash
npm run mainnet:update-twap
```

---

## 🔄 Set Up Continuous Operations

### Start Auto-Updater

**TWAP oracles need updates every 5+ minutes:**

```bash
# Start auto-updater in background
npm run mainnet:auto-update

# Or use PM2 for production
pm2 start "npm run mainnet:auto-update" --name sora-updater
pm2 save
pm2 startup  # Auto-start on reboot
```

**Monitor auto-updater:**
```bash
pm2 logs sora-updater
```

---

### Set Up Question Monitoring

**Watch for new questions:**

```bash
# Start question watcher
npm run mainnet:watch-questions

# Or with PM2
pm2 start "npm run mainnet:watch-questions" --name sora-watcher
pm2 save
```

**Expected output:**
```
👀 Watching for new questions on mainnet...

📝 New Question #1:
   Requester: 0xUser...
   Type: PRICE
   Bounty: 0.01 BNB
   Deadline: 2025-10-20 12:00 UTC
   Question: "What is the current WBNB/BUSD price?"

⚡ Auto-answer available (PRICE question with TWAP oracle)
```

---

### Fund Oracle Provider Wallet

**Check provider balance:**
```bash
npm run mainnet:provider-balance
```

**Recommended balances:**
- Minimum: 0.05 BNB (for gas)
- Recommended: 0.2 BNB (sustainable operations)
- Ideal: 0.5 BNB (no downtime risk)

**Set up low-balance alerts:**
```bash
# Edit .env
MIN_PROVIDER_BALANCE=0.1

# Restart watcher to enable alerts
pm2 restart sora-watcher
```

---

## 📊 Monitoring & Analytics

### Track Contract Metrics

**Daily metrics to monitor:**

1. **Question Volume:**
   ```bash
   npm run mainnet:stats -- --period 24h
   ```

2. **Response Rate:**
   - Answered questions / Total questions
   - Target: >95%

3. **Average Response Time:**
   - Time from question to answer
   - Target: <1 hour

4. **Provider Earnings:**
   ```bash
   npm run mainnet:earnings
   ```

5. **Gas Costs:**
   - Track daily gas expenditure
   - Monitor for unusual spikes

---

### Set Up Alerts

**Recommended alerts:**

```javascript
// Example: Slack/Discord webhook integration
{
  "new_question": "Webhook when question asked",
  "low_balance": "Provider balance < 0.1 BNB",
  "high_gas": "Gas price > 20 Gwei",
  "unanswered_deadline": "Question nearing deadline",
  "contract_paused": "Emergency pause activated"
}
```

**Implementation:**
- See `/scripts/monitoring/` for webhook examples
- Configure in `.env`:
  ```bash
  WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
  ENABLE_ALERTS=true
  ```

---

## 🔐 Security Operations

### Test Emergency Pause

**Pause contract (testnet recommended first):**
```bash
npm run mainnet:pause
```

**Verify paused state:**
```bash
npm run mainnet:status
# Should show: "Contract is paused"
```

**Try to ask question (should fail):**
```bash
npm run mainnet:test-question
# Expected: Transaction reverted with "Pausable: paused"
```

**Unpause:**
```bash
npm run mainnet:unpause
```

---

### Transfer Ownership (Optional)

**If using multisig for security:**

```bash
# Transfer to Gnosis Safe or other multisig
npm run mainnet:transfer-ownership -- --newOwner 0xMultisigAddress
```

**⚠️ WARNING:** 
- This is permanent! Double-check address.
- Multisig must be deployed and tested first.
- Consider testing on testnet first.

---

## 📝 Update Documentation

### 1. Update README.md

Replace mainnet badge placeholder:

```markdown
<!-- Before -->
[![BSC Mainnet](https://img.shields.io/badge/BSC-Mainnet%20Live-green.svg)](https://bscscan.com/address/YOUR_MAINNET_ADDRESS#code)

<!-- After -->
[![BSC Mainnet](https://img.shields.io/badge/BSC-Mainnet%20Live-green.svg)](https://bscscan.com/address/0xYourActualMainnetAddress#code)
```

### 2. Update replit.md

Add deployment information:

```markdown
## Mainnet Deployment

**Deployed:** October 19, 2025
- **Oracle Contract:** 0xYourMainnetAddress (✅ Verified)
- **Chain:** BSC Mainnet (chainId: 56)
- **Status:** Live and operational
- **View on BSCScan:** https://bscscan.com/address/0xYourMainnetAddress#code
```

### 3. Announce Deployment

**Social media post template:**

```
🎉 Sora Oracle is now LIVE on BSC Mainnet!

✅ Fully permissionless oracle for prediction markets
✅ Auto-create TWAP oracles for ANY PancakeSwap pair
✅ 84.9% gas savings vs traditional oracles
✅ Open source & MIT licensed

📝 Contract: 0xYour...Address
🔗 Docs: soraoracle.com/documentation
🛠️ Start building: github.com/yourusername/sora-oracle

#BNBChain #DeFi #Oracle #Web3
```

---

## 🧪 Ongoing Testing

### Weekly Checks

- [ ] Ask test question and verify answer
- [ ] Check all TWAP oracles updating correctly
- [ ] Verify provider balance sufficient
- [ ] Review gas costs (should be low due to optimizations)
- [ ] Check for any failed transactions
- [ ] Monitor question volume and trends

### Monthly Reviews

- [ ] Security audit of operations
- [ ] Review and optimize gas usage
- [ ] Check for contract upgrade opportunities
- [ ] Community feedback review
- [ ] Documentation updates
- [ ] Consider additional TWAP pairs based on usage

---

## 📈 Growth & Scaling

### Add More TWAP Oracles

**Popular pairs to consider:**
```bash
# BTC tracking
npm run mainnet:add-twap -- --pair 0xBTCB_WBNB_PAIR

# ETH tracking  
npm run mainnet:add-twap -- --pair 0xETH_WBNB_PAIR

# Stablecoins
npm run mainnet:add-twap -- --pair 0xUSDC_BUSD_PAIR
```

**Cost:** 0.02 BNB per new TWAP oracle

### Support New Markets

As projects build on Sora Oracle:
- Monitor integration questions
- Add requested TWAP pairs
- Provide integration support
- Gather feedback for improvements

---

## 🐛 Troubleshooting

### "Transaction failed: insufficient funds"
**Provider wallet needs BNB:**
```bash
# Check balance
npm run mainnet:provider-balance

# Fund provider wallet with 0.2 BNB
```

### "TWAP oracle not updating"
**Check auto-updater is running:**
```bash
pm2 list
pm2 logs sora-updater

# Restart if needed
pm2 restart sora-updater
```

### "Questions going unanswered"
**Check question watcher:**
```bash
pm2 logs sora-watcher

# Manually check pending questions
npm run mainnet:pending-questions
```

### "High gas costs"
**BSC gas prices fluctuate:**
- Check current gas price: https://bscscan.com/gastracker
- Wait for off-peak hours (typically 2-6 AM UTC)
- Gas optimizations already reduce costs by 84.9%

---

## 🎯 Success Metrics

**Your deployment is successful when:**

✅ Contract verified on BSCScan  
✅ Test question asked and answered  
✅ TWAP oracles updating every 5+ minutes  
✅ Auto-updater running continuously  
✅ Provider wallet funded (>0.2 BNB)  
✅ Question monitoring active  
✅ No failed transactions in 24 hours  
✅ Documentation updated with mainnet address  
✅ Social media announcement published  
✅ Zero security issues detected  

---

## 📞 Support & Resources

- **Documentation:** https://soraoracle.com/documentation
- **GitHub Issues:** Report bugs or ask questions
- **Twitter/X:** [@soraoracle](https://x.com/soraoracle) for updates
- **BSC Discord:** Community support for network issues

---

**Congratulations on your mainnet deployment! 🎉**

The Sora Oracle is now live and ready to power decentralized prediction markets and DeFi applications with reliable, permissionless price feeds.
