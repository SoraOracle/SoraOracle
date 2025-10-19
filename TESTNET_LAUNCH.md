# 🚀 Testnet Launch Checklist

Follow these steps to deploy and test Sora Oracle on BSC Testnet.

## ✅ Pre-Launch Checklist

### 1. Get Testnet BNB
You need testnet BNB for:
- Deploying contracts (~0.1 BNB)
- Testing oracle questions (~0.05 BNB)
- Gas for interactions (~0.01 BNB)

**Get testnet BNB:**
- Faucet: https://testnet.bnbchain.org/faucet-smart
- Need ~0.2 BNB total for testing

### 2. Setup Private Key
```bash
# Edit .env file
nano .env

# Add your testnet wallet private key
PRIVATE_KEY=your_private_key_here  # ⚠️ TESTNET ONLY!
```

**⚠️ SECURITY:**
- Use a **NEW wallet** for testnet
- Never use your mainnet wallet
- Never commit .env to git

### 3. Verify Setup
```bash
# Check compilation
npm run compile

# Run tests locally
npm test
```

## 🚀 Deployment Steps

### Step 1: Deploy Oracle
```bash
npm run deploy:sora
```

This will:
- Deploy SoraOracle contract
- Deploy PancakeTWAPOracle for major pairs:
  - WBNB/BUSD
  - WBNB/USDT
  - CAKE/WBNB
- Output contract addresses

**Save the output!** You'll need the oracle address.

### Step 2: Update .env with Oracle Address
```bash
# Add to .env
SORA_ORACLE_ADDRESS=0xYourOracleAddressHere
```

### Step 3: Start Auto-Updater
```bash
npm run sora:auto-update
```

This updates TWAP prices every 5 minutes. Keep it running!

## 🧪 Testing Scenarios

### Test 1: Query ANY Token Pair (Permissionless!)

```bash
# Test with existing pair
node examples/integrations/integrate-any-token.js

# Should show:
# ✅ Price for WBNB/BUSD
# ✅ Auto-created TWAP oracle
# ✅ Bootstrap vs TWAP mode
```

### Test 2: Price Alerts Bot
```bash
# Monitor price movements
node examples/utilities/price-alerts.js

# Let it run and watch for alerts
```

### Test 3: Check TWAP Prices
```bash
npm run sora:prices

# Should show:
# 📊 WBNB/BUSD TWAP: $XXX
# 📊 WBNB/USDT TWAP: $XXX
# 📊 CAKE/WBNB TWAP: $XXX
# ⚠️ Bootstrap mode indicators if just deployed
```

### Test 4: Ask Oracle Question
```bash
npm run sora:ask

# Follow prompts:
# 1. Choose question type (YESNO recommended)
# 2. Enter question: "Will CAKE reach $5 in 24 hours?"
# 3. Set deadline: 1 day from now
# 4. Pay 0.01 BNB fee

# Save the questionId!
```

### Test 5: Answer Question (Oracle Provider)
```bash
npm run sora:answer <ORACLE_ADDRESS> <QUESTION_ID> yesno

# Follow prompts to provide answer
```

### Test 6: Withdraw Earnings
```bash
npm run sora:withdraw <ORACLE_ADDRESS>
```

### Test 7: Custom Token Pair (Advanced)
```javascript
// Deploy your own prediction market
const market = await deployContract("BasicPredictionMarket", [oracleAddress]);

// Create market
await market.createMarket("Will my token moon?", deadline, {value: fee});

// Test the flow
```

## 📊 What to Test

### Core Functionality
- [ ] Deploy oracle successfully
- [ ] Auto-updater runs without errors
- [ ] TWAP prices update every 5 minutes
- [ ] Can query any PancakeSwap pair
- [ ] Bootstrap mode works (0-5 min)
- [ ] TWAP mode works (5+ min)

### Permissionless Features
- [ ] Query new pair auto-creates oracle
- [ ] No approval needed for new tokens
- [ ] Bootstrap fallback to spot price
- [ ] TWAP ready after 5 minutes

### Oracle Questions
- [ ] Can ask YES/NO questions
- [ ] Can ask PRICE questions
- [ ] Can ask GENERAL questions
- [ ] Fee payment works
- [ ] Refund after 7 days works

### Security
- [ ] Only provider can answer
- [ ] Only provider can withdraw
- [ ] Refunds prevent double-claiming
- [ ] Bootstrap mode clearly indicated

## 🔍 Monitor & Debug

### Check Deployment
```bash
# View on BSCScan Testnet
https://testnet.bscscan.com/address/<YOUR_ORACLE_ADDRESS>
```

### View TWAP Oracle
```javascript
const oracle = await ethers.getContractAt("SoraOracle", ORACLE_ADDRESS);
const wbnbBusdPair = "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16";
const twapAddress = await oracle.twapOracles(wbnbBusdPair);

console.log("TWAP Oracle:", twapAddress);
// View on BSCScan: https://testnet.bscscan.com/address/<TWAP_ADDRESS>
```

### Check Logs
```bash
# Auto-updater logs
npm run sora:auto-update

# Look for:
# ✅ Successful updates
# ⚠️ Bootstrap warnings
# ❌ Errors (if any)
```

## ⚠️ Common Issues

### "Insufficient funds"
- Get more testnet BNB from faucet
- Need ~0.2 BNB for full testing

### "TWAP not ready"
- Wait 5 minutes after oracle creation
- Auto-updater needs to run first update
- Check `canConsult()` returns true

### "Invalid pair"
- Verify pair has liquidity on PancakeSwap testnet
- Some pairs may not exist on testnet
- Use mainnet pairs (WBNB/BUSD, etc.)

### "Transaction failed"
- Check gas price (5-10 gwei)
- Verify you have enough BNB
- Check contract isn't paused

## 📈 Success Metrics

After testing, you should have:
- ✅ Oracle deployed and verified
- ✅ 3+ TWAP oracles created
- ✅ Auto-updater running smoothly
- ✅ Successfully asked and answered questions
- ✅ Tested permissionless pair addition
- ✅ Bootstrap → TWAP transition working
- ✅ All gas costs recorded

## 🎯 Next Steps After Testing

### If Everything Works:
1. Document any gas cost findings
2. Note any UX improvements needed
3. Consider mainnet deployment
4. Share with community for feedback

### If Issues Found:
1. Document the issue
2. Check test suite for edge cases
3. Open GitHub issue if needed
4. Test fixes on testnet

## 🚀 Mainnet Considerations

**Before mainnet:**
- [ ] Full security audit
- [ ] Comprehensive testnet testing (1+ week)
- [ ] Gas optimization review
- [ ] Economic model validation
- [ ] Emergency procedures documented
- [ ] Multi-sig for admin functions

**Cost Estimates (Mainnet):**
- Deploy SoraOracle: ~$5-8 (3-5M gas)
- Add TWAP oracle: ~$4 (2M gas)
- Ask question: ~$0.30 (150k gas)
- Update TWAP: ~$0.15 (75k gas)

*Based on 5 gwei and $600 BNB*

## 📞 Need Help?

- Check documentation in `/docs`
- Review examples in `/examples`
- Open GitHub issue
- Verify testnet BNB balance

---

**Good luck with your testnet launch!** 🚀

Remember: This is testnet - experiment, break things, and learn!
