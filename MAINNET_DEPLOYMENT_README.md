# 🚀 Sora Oracle v5.0 - Mainnet Deployment

## Quick Start

### Prerequisites

1. **Wallet with BNB**
   - Need 0.5+ BNB for deployment gas (~$300 USD)
   - Create fresh wallet (never use personal wallet)
   - Get private key from MetaMask

2. **Environment Setup**
   - Add `PRIVATE_KEY` to Replit Secrets
   - Verify `BSCSCAN_API_KEY` exists

3. **USDC for Worker Wallets**
   - Need $1,000 USDC to fund worker pool
   - 10 workers × $100 USDC each
   - Can start with less for testing

---

## Deployment Steps

### 1. Run Pre-Deployment Checklist

```bash
node scripts/pre-deployment-checklist.js
```

**Expected output:**
```
✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT!
```

### 2. Deploy S402Facilitator Contract

```bash
npx hardhat run scripts/deploy-s402-mainnet.js --network bscMainnet
```

**This will:**
- Deploy S402Facilitator to mainnet
- Verify on BSCScan automatically
- Save deployment info to `deployment-s402-mainnet.json`
- Display contract address

**Expected time:** 2-5 minutes  
**Cost:** ~0.05-0.1 BNB (~$30-60 USD)

### 3. Update Configuration Files

After deployment, update these files with your contract address:

**A. `src/sdk/s402-config.ts`**
```typescript
facilitatorAddress: '0xYOUR_DEPLOYED_ADDRESS_HERE'
```

**B. `frontend/src/config.ts`**
```typescript
s402FacilitatorAddress: '0xYOUR_DEPLOYED_ADDRESS_HERE'
```

**C. `server/s402-middleware.js`**
```javascript
network: 'bsc-mainnet',
chainId: 56
```

### 4. Initialize Worker Wallets

```bash
# Generate and fund 10 worker wallets
node scripts/fund-workers.js --amount=100
```

**IMPORTANT:** Save the private keys securely!

### 5. Test Payment Flow

```bash
# Test with small amount first
node scripts/test-s402-payment.js --amount=0.01
```

### 6. Start Monitoring

```bash
# Check worker balances
node scripts/check-worker-balances.js

# Monitor BSCScan
https://bscscan.com/address/YOUR_FACILITATOR_ADDRESS
```

---

## What Gets Deployed

### Smart Contract: S402Facilitator

**Address:** TBD after deployment  
**Network:** BNB Chain Mainnet (56)  
**USDC:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`  
**Platform Fee:** 1% (100 bps)  

**Features:**
- EIP-2612 permit-based payments
- Replay attack prevention
- Platform fee collection
- Batch settlement support
- Owner-controlled fee withdrawal

### Multi-Wallet Pool

**Worker Count:** 10 wallets  
**Funding:** $100 USDC each  
**Total Pool:** $1,000 USDC  
**Parallelization:** 10x speedup vs sequential  

---

## Post-Deployment

### Immediate Tasks

- [ ] Verify contract on BSCScan
- [ ] Update all configs with contract address
- [ ] Fund worker wallets with USDC
- [ ] Test small payment ($0.01)
- [ ] Monitor first 24 hours closely

### Security Tasks

- [ ] Transfer ownership to multi-sig
- [ ] Set up monitoring alerts
- [ ] Document emergency procedures
- [ ] Review worker wallet security
- [ ] Enable rate limiting

### Operational Tasks

- [ ] Set up weekly fee withdrawal
- [ ] Configure monitoring dashboard
- [ ] Create runbook for incidents
- [ ] Train support team
- [ ] Prepare user documentation

---

## Monitoring

### BSCScan Dashboard

```
Contract: https://bscscan.com/address/YOUR_ADDRESS
Events: Filter by "PaymentSettled"
```

### Key Metrics to Watch

1. **Payment Volume**
   - Daily transaction count
   - Total USDC processed
   - Platform fees collected

2. **Worker Health**
   - Balance distribution
   - Low balance alerts (<$10)
   - High balance alerts (>$500)

3. **Contract Activity**
   - Settlement success rate
   - Failed transactions
   - Unusual patterns

---

## Emergency Procedures

### If Worker Compromised

1. Stop funding affected wallet
2. Generate replacement wallet
3. Update pool configuration
4. Monitor for unauthorized txs

### If Contract Bug Found

1. Pause operations (if possible)
2. Deploy new facilitator
3. Update all configurations
4. Migrate accumulated fees

### If RPC Down

1. Switch to backup RPC provider
2. Update configuration
3. Monitor recovery
4. Document incident

---

## Cost Breakdown

### One-Time Costs

| Item | Amount |
|------|--------|
| Contract deployment | ~0.05-0.1 BNB (~$30-60) |
| BSCScan verification | Free |
| Worker wallet setup | Free |
| **Total** | **~$30-60 USD** |

### Ongoing Costs (Monthly)

| Item | Amount |
|------|--------|
| Worker funding | $1,000 USDC |
| Gas fees (10k ops) | ~$50 |
| **Total** | **~$1,050/mo** |

### Revenue (at 1% fee)

| Volume | Platform Fee |
|--------|-------------|
| $5,000/mo | $50 |
| $50,000/mo | $500 |
| $500,000/mo | $5,000 |

**Break-even:** ~$105k monthly volume

---

## Support

### Documentation

- **Deployment Guide:** `V5_DEPLOYMENT_GUIDE.md`
- **Operations Manual:** `V5_OPERATIONS_MANUAL.md`
- **Technical Spec:** `SORA_ORACLE_TECHNICAL_SPECIFICATION.md`

### Scripts

- `deploy-s402-mainnet.js` - Deploy contract
- `fund-workers.js` - Fund worker wallets
- `check-worker-balances.js` - Monitor balances
- `pre-deployment-checklist.js` - Validate setup

### Contracts

- **S402Facilitator:** `contracts/S402Facilitator.sol`
- **Tests:** `test/S402Facilitator.test.js`

---

## Troubleshooting

### Deployment Fails

**"Insufficient funds"**
- Add more BNB to wallet (need 0.5+ BNB)

**"Invalid nonce"**
- Wait for pending transactions
- Reset nonce in MetaMask

**"Verification failed"**
- Verify manually on BSCScan
- Check BSCSCAN_API_KEY

### Payment Issues

**"402 Payment Required"**
- Check X-PAYMENT header format
- Verify permit signature
- Ensure amount >= operation price

**"Permit already used"**
- Replay attack detected
- Generate new payment proof

**"Insufficient payment"**
- Check operation pricing
- Verify USDC amount

---

## Next Steps

1. ✅ Deploy to mainnet
2. ⏰ Test with small amounts
3. ⏰ Monitor for 24-48 hours
4. ⏰ Announce launch to users
5. ⏰ Plan EIP-4337 integration

---

**Sora Oracle v5.0** - Production-ready micropayments on BNB Chain 🚀

Last updated: October 27, 2025
