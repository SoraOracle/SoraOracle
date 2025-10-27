# Sora Oracle v5.0 - Mainnet Deployment Guide

## Overview

**Sora Oracle v5.0** introduces **s402 micropayment protocol** for BNB Chain, enabling HTTP 402 payments for oracle API access and prediction market operations using USDC/USDT.

### Key Features

✅ **Multi-wallet parallelization** - 10x transaction speedup  
✅ **EIP-2612 permit-based payments** - Gasless approvals  
✅ **Permissionless oracle** - AI-powered API discovery  
✅ **Production-ready smart contracts** - S402Facilitator on mainnet  
✅ **Honest branding** - s402 (not x402 compliant, but transparent)  

---

## Pre-Deployment Checklist

### 1. Wallet Preparation

- [ ] Create dedicated deployer wallet (MetaMask recommended)
- [ ] Fund wallet with **0.5 BNB minimum** for deployment gas
- [ ] Export `PRIVATE_KEY` from wallet (Settings → Security → Reveal Private Key)
- [ ] **CRITICAL**: Use fresh wallet, never your personal wallet

### 2. Environment Setup

- [ ] Set `PRIVATE_KEY` in Replit Secrets (or `.env`)
- [ ] Verify `BSCSCAN_API_KEY` is configured
- [ ] Check network connectivity to BNB Chain RPC

### 3. Configuration Verification

Run pre-deployment checks:

```bash
# Check mainnet configuration
npx hardhat run scripts/check-mainnet-config.js --network bscMainnet
```

Expected output:
```
✅ Connected to BSC Mainnet
✅ Sufficient balance for deployment
✅ Valid oracle provider address
✅ BSCScan API key configured
✅ Gas price is reasonable
```

---

## Deployment Process

### Step 1: Deploy S402Facilitator Contract

```bash
npx hardhat run scripts/deploy-s402-mainnet.js --network bscMainnet
```

**What this deploys:**
- **S402Facilitator** - Payment settlement contract
- **USDC Integration** - Binance-Bridged USDC at `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
- **Platform Fee** - 1% fee (adjustable by owner)

**Expected deployment cost:** ~0.05-0.1 BNB (~$30-60 USD)

### Step 2: Save Deployment Info

After deployment, you'll receive:

```json
{
  "network": "bscMainnet",
  "chainId": 56,
  "facilitator": "0x...",  // ← SAVE THIS
  "usdc": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  "deployer": "0x...",
  "transactionHash": "0x...",
  "bscscanUrl": "https://bscscan.com/address/0x..."
}
```

**Save this file:** `deployment-s402-mainnet.json`

### Step 3: Update Configuration Files

#### A. Update `src/sdk/s402-config.ts`

```typescript
export const S402_MAINNET_CONFIG: S402NetworkConfig = {
  // ... other config
  facilitatorAddress: '0xYOUR_DEPLOYED_ADDRESS_HERE', // ← UPDATE THIS
};
```

#### B. Update `frontend/src/config.ts`

```typescript
export const SORA_CONFIG: SoraConfig = {
  // ... existing config
  s402FacilitatorAddress: '0xYOUR_DEPLOYED_ADDRESS_HERE', // ← ADD THIS
  chainId: 56,
  rpcUrl: 'https://bsc-dataseed.binance.org/'
};
```

#### C. Update `server/s402-middleware.js`

```javascript
// Update network from testnet to mainnet
payment: {
  // ...
  network: 'bsc-mainnet',  // ← CHANGE from 'bsc-testnet'
  chainId: 56              // ← CHANGE from 97
}
```

### Step 4: Verify Contract on BSCScan

If auto-verification fails:

```bash
npx hardhat verify --network bscMainnet \
  YOUR_FACILITATOR_ADDRESS \
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
```

---

## Post-Deployment Setup

### 1. Initialize Multi-Wallet Pool

```typescript
import { ethers } from 'ethers';
import { MultiWalletS402Pool } from '@sora-oracle/sdk';

const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const masterWallet = new ethers.Wallet(process.env.MASTER_PRIVATE_KEY, provider);

const pool = new MultiWalletS402Pool({
  masterWallet,
  facilitatorConfig: {
    facilitatorAddress: '0xYOUR_FACILITATOR_ADDRESS',
    usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org/'
  },
  walletCount: 10,
  autoFund: true,
  fundingAmountUSDC: '100' // $100 USDC per worker
});

await pool.initialize();
```

### 2. Fund Worker Wallets

Transfer USDC from master wallet to worker wallets:

```typescript
// Approve USDC for transfers
const usdc = new ethers.Contract(
  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  ['function approve(address spender, uint256 amount) returns (bool)'],
  masterWallet
);

await usdc.approve(
  masterWallet.address,
  ethers.parseUnits('1000', 6) // Approve 1000 USDC
);

// Fund workers
await pool.fundWorkers('100'); // $100 USDC each
```

### 3. Enable s402 Middleware in Backend

```javascript
// server/index.js
const { S402Middleware } = require('./s402-middleware');

const s402 = new S402Middleware(
  '0xYOUR_FACILITATOR_ADDRESS',
  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  provider
);

// Protect oracle endpoints
app.post('/api/oracle/query',
  s402.requirePayment('oracleQuery'),
  async (req, res) => {
    // Oracle logic here
  }
);
```

### 4. Test Payment Flow (Start Small!)

```typescript
// Test with $0.01 payment
const proof = await pool.createPayment('oracleQuery'); // $0.01

// Verify proof works
const response = await fetch('https://your-api.com/api/oracle/query', {
  method: 'POST',
  headers: {
    'X-PAYMENT': JSON.stringify(proof)
  }
});

console.log(response.status); // Should be 200, not 402
```

---

## Monitoring & Operations

### Monitor Contract Activity

**BSCScan Dashboard:**
```
https://bscscan.com/address/YOUR_FACILITATOR_ADDRESS
```

**Key events to monitor:**
- `PaymentSettled` - Track all successful payments
- `PlatformFeeUpdated` - Fee changes (should be rare)
- `FeesWithdrawn` - Platform fee withdrawals

### Withdraw Accumulated Fees

```bash
# Using Hardhat console
npx hardhat console --network bscMainnet

> const facilitator = await ethers.getContractAt(
    'S402Facilitator',
    'YOUR_FACILITATOR_ADDRESS'
  );
> await facilitator.withdrawFees('YOUR_TREASURY_ADDRESS');
```

### Update Platform Fee (if needed)

```bash
# Update fee (100 = 1%, max 1000 = 10%)
> await facilitator.updatePlatformFee(50); // Change to 0.5%
```

---

## Security Best Practices

### 1. Transfer Ownership to Multi-Sig

After deployment, transfer S402Facilitator ownership to Gnosis Safe multi-sig:

```javascript
await facilitator.transferOwnership('0xYOUR_MULTISIG_ADDRESS');
```

### 2. Worker Wallet Security

- **Limit USDC per wallet**: Max $500 USDC per worker
- **Weekly rotation**: Generate new worker wallets regularly
- **Monitor balances**: Set up alerts for low/high balances
- **Encrypt backups**: Store worker private keys in secure vault

### 3. Rate Limiting

Protect endpoints from abuse:

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api/', apiLimiter);
```

### 4. Emergency Procedures

**If contract is compromised:**

1. **Pause operations** (if emergency pause is implemented)
2. **Sweep worker wallets** to master
3. **Withdraw accumulated fees** immediately
4. **Deploy new facilitator** if necessary

---

## Troubleshooting

### Deployment Fails

**Error:** `Insufficient funds`  
**Fix:** Add more BNB to deployer wallet (need 0.5+ BNB)

**Error:** `Invalid nonce`  
**Fix:** Reset MetaMask nonce or wait for pending transactions

**Error:** `Contract verification failed`  
**Fix:** Verify manually on BSCScan using contract source code

### Payment Verification Fails

**Error:** `402 Payment Required` persists  
**Fix:** Check `X-PAYMENT` header format matches expected schema

**Error:** `Permit already used`  
**Fix:** Replay attack detected - generate new payment proof

**Error:** `Insufficient payment`  
**Fix:** Check operation price matches expected amount

### Worker Wallet Issues

**Error:** `TransferFrom failed`  
**Fix:** Ensure worker has approved facilitator contract

**Error:** `Nonce too low`  
**Fix:** Worker wallet nonce out of sync - wait or reset

---

## Cost Analysis

### Deployment Costs

| Item | Estimated Cost |
|------|---------------|
| S402Facilitator deployment | 0.05-0.1 BNB (~$30-60) |
| Contract verification | Free |
| **Total** | **~$30-60 USD** |

### Operational Costs (Monthly)

| Item | Cost | Notes |
|------|------|-------|
| Worker wallet funding | $1,000 | 10 wallets × $100 USDC |
| Gas fees (10k operations) | ~$50 | ~$0.005/operation |
| Platform fees (collected) | +$20-100 | 1% of volume |
| **Net Cost** | **~$950/mo** | Break-even at ~$2k volume |

### Revenue Potential

At **1% platform fee** with 100k monthly operations:
- **Volume:** $5,000 (100k ops × $0.05 avg)
- **Platform fees:** $50
- **Net:** -$900/mo (needs scale)

At **1M operations/mo:**
- **Volume:** $50,000
- **Platform fees:** $500
- **Net:** -$450/mo (approaching break-even)

---

## Next Steps After Deployment

1. **Test thoroughly** with small amounts ($1-10 USDC)
2. **Monitor logs** for 24-48 hours
3. **Document issues** and create runbook
4. **Set up alerts** for unusual activity
5. **Announce launch** to users
6. **Prepare support** for user questions
7. **Plan EIP-4337 integration** (Phase 2)

---

## Support & Resources

### Documentation
- **Technical Spec:** `SORA_ORACLE_TECHNICAL_SPECIFICATION.md`
- **EIP Comparison:** `EIP_PAYMENT_STANDARDS_COMPARISON.md`
- **Implementation Guide:** `USDC_USDT_BNB_CHAIN_IMPLEMENTATION.md`

### Smart Contract
- **Source:** `contracts/S402Facilitator.sol`
- **Tests:** Run `npx hardhat test`
- **BSCScan:** Verify on https://bscscan.com

### API Reference
- **SDK:** `src/sdk/MultiWalletS402Pool.ts`
- **Middleware:** `server/s402-middleware.js`
- **Config:** `src/sdk/s402-config.ts`

---

## Version History

### v5.0.0 (Current - Mainnet Ready)
- ✅ S402Facilitator smart contract
- ✅ Multi-wallet parallelization (10x speedup)
- ✅ EIP-2612 permit-based payments
- ✅ Permissionless oracle with AI discovery
- ✅ Production deployment on BNB mainnet

### v5.1.0 (Planned - Q1 2026)
- ⏰ EIP-4337 smart account integration
- ⏰ Batch payment operations
- ⏰ USDC paymaster (custom development)
- ⏰ Unlimited parallelization

### v6.0.0 (Planned - Q3 2026)
- ⏰ Native Circle USDC migration
- ⏰ Cross-chain expansion (Ethereum, Base)
- ⏰ Institutional API tier

---

**Sora Oracle v5.0** - First production-ready oracle SDK with integrated micropayments on BNB Chain 🚀
