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

**Verify via BSCScan:**
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
# Edit scripts/sora-ask.js to ask your test question, then:
npm run mainnet:ask
```

**Answer the Test Question:**
```bash
# Edit scripts/sora-answer.js with question ID and answer, then:
npm run mainnet:answer
```

**Withdraw Provider Rewards:**
```bash
npm run mainnet:withdraw
```

---

### 4. Verify TWAP Oracles

**Check TWAP prices:**
```bash
npm run mainnet:prices
```

This will show:
- Current TWAP and spot prices for all configured pairs
- Whether oracles can be consulted (after 5-min bootstrap)
- Last update time

**Note:** First 5 minutes after deployment, oracles are in bootstrap mode. This is normal.

**Update TWAP oracles:**
```bash
npm run mainnet:auto-update
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

**Monitor for new questions:**

You can monitor QuestionAsked events via BSCScan:
1. Go to your contract on BSCScan
2. Click "Events" tab
3. Filter by "QuestionAsked" event

Or implement your own event listener using the contract ABI.

---

### Fund Oracle Provider Wallet

**Check provider balance via BSCScan:**
- Visit: https://bscscan.com/address/0xYourProviderAddress
- Ensure balance > 0.05 BNB

**Recommended balances:**
- Minimum: 0.05 BNB (for gas)
- Recommended: 0.2 BNB (sustainable operations)
- Ideal: 0.5 BNB (no downtime risk)

**Monitor balance:** Check BSCScan regularly to ensure provider has sufficient BNB for gas.

---

## 📊 Monitoring & Analytics

### Track Contract Metrics

**Monitor via BSCScan:**

1. **Question Volume:** Check "QuestionAsked" events on BSCScan
2. **Response Rate:** Compare "QuestionAsked" vs "AnswerProvided" event counts
3. **Provider Earnings:** Check provider wallet balance growth
4. **Gas Costs:** View transaction history on BSCScan for gas usage

**Recommended:** Build custom monitoring dashboard using BSCScan API or web3 event listeners.

---

### Set Up Alerts (Optional)

You can implement custom alerts using:
- BSCScan email notifications (available in your BSCScan account)
- Third-party services like Tenderly or Blocknative
- Custom event listeners with web3.js or ethers.js
- Webhook integrations to Slack/Discord

---

## 🔐 Security Operations

### Test Emergency Pause

**Pause contract via BSCScan:**
1. Go to contract → "Write Contract" → "Connect Wallet"
2. Find `pause()` function
3. Click "Write" and confirm transaction

**Verify paused state:**
- Go to "Read Contract"
- Check `paused()` function returns `true`

**Unpause:**
- Go to "Write Contract"
- Call `unpause()` function

---

### Transfer Ownership (Optional)

**If using multisig for security:**

1. Deploy and test your multisig wallet (Gnosis Safe recommended)
2. Go to contract on BSCScan → "Write Contract"
3. Call `transferOwnership(newOwner)` with multisig address
4. Confirm transaction

**⚠️ WARNING:** This is permanent! Verify the multisig address is correct.

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

**To add new pairs:**
1. Go to contract on BSCScan → "Write Contract"
2. Call `addTWAPOracle(pairAddress)` with 0.02 BNB value
3. Get pair addresses from PancakeSwap
4. Confirm transaction

**Cost:** 0.02 BNB per new TWAP oracle

**Popular pairs to consider:**
- BTCB/WBNB
- ETH/WBNB  
- USDC/BUSD

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
- Check balance on BSCScan: https://bscscan.com/address/0xProviderAddress
- Send 0.2 BNB to provider wallet

### "TWAP oracle not updating"
**Ensure auto-updater is running:**
```bash
# Check if running (if using PM2)
pm2 list

# Or run manually
npm run mainnet:auto-update
```

### "Questions going unanswered"
**Check for pending questions:**
- Go to BSCScan → Events → Filter "QuestionAsked"
- Compare with "AnswerProvided" events
- Answer pending questions manually via BSCScan or scripts

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
