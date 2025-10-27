# Sora Oracle v5.0 - Operations Manual

## Daily Operations

### 1. Monitor Worker Wallet Balances

```bash
# Check all worker balances
node scripts/check-worker-balances.js
```

**Expected output:**
```
Worker 0: 95.23 USDC
Worker 1: 102.45 USDC
Worker 2: 88.12 USDC
...
Average: 98.50 USDC
```

**Action required if:**
- Any wallet < $10 USDC → Refund immediately
- Any wallet > $500 USDC → Sweep excess to master
- Total pool < $500 USDC → Fund from master wallet

### 2. Monitor Payment Settlement

Check BSCScan for `PaymentSettled` events:

```
https://bscscan.com/address/YOUR_FACILITATOR_ADDRESS#events
```

**Normal activity:**
- 100-1000 events/day (depending on traffic)
- Consistent payment amounts ($0.01-$0.15)
- No failed transactions

**Red flags:**
- Spike in large payments (>$1 USDC) → Investigate
- Repeated failed settlements → Check worker balances
- Same user making 100s of payments → Rate limiting issue

### 3. Platform Fee Withdrawal (Weekly)

```bash
npx hardhat console --network bscMainnet

> const facilitator = await ethers.getContractAt(
    'S402Facilitator',
    'YOUR_FACILITATOR_ADDRESS'
  );
> const fees = await facilitator.accumulatedFees();
> console.log('Accumulated fees:', ethers.formatUnits(fees, 6), 'USDC');

# Withdraw if > $50 USDC
> await facilitator.withdrawFees('YOUR_TREASURY_ADDRESS');
```

---

## Incident Response

### Scenario 1: Worker Wallet Compromised

**Symptoms:**
- Unauthorized USDC transfers
- Worker balance drops to zero unexpectedly

**Response:**
1. **Immediate:** Stop funding compromised wallet
2. **Within 5 min:** Generate new worker wallet
3. **Within 15 min:** Update multi-wallet pool configuration
4. **Within 30 min:** Review transaction logs for breach source

```typescript
// Replace compromised wallet
await pool.replaceWallet(compromisedIndex, newWallet);
```

**Post-incident:**
- Review security practices
- Rotate all worker keys if breach is systematic
- Consider hardware wallet for master

### Scenario 2: S402Facilitator Bug Discovered

**Symptoms:**
- Payments settling incorrectly
- Platform fees miscalculated
- Contract reverts unexpectedly

**Response:**
1. **Immediate:** Pause new payments (if possible)
2. **Within 1 hour:** Deploy new facilitator contract
3. **Within 2 hours:** Update all configs to new address
4. **Within 4 hours:** Migrate accumulated fees from old contract

```bash
# Deploy new facilitator
npx hardhat run scripts/deploy-s402-mainnet.js --network bscMainnet

# Withdraw fees from old contract
npx hardhat console --network bscMainnet
> const oldFacilitator = await ethers.getContractAt('S402Facilitator', 'OLD_ADDRESS');
> await oldFacilitator.withdrawFees('TREASURY_ADDRESS');
```

**Post-incident:**
- Security audit of new contract
- Document bug and fix
- Notify users of contract migration

### Scenario 3: BNB Chain RPC Failure

**Symptoms:**
- Timeout errors from provider
- "Connection refused" errors
- Intermittent transaction failures

**Response:**
1. **Immediate:** Switch to backup RPC provider
2. **Within 5 min:** Update configuration with fallback RPC
3. **Monitor:** Check if primary RPC recovers

```typescript
// Fallback RPC providers
const providers = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc.nodereal.io',
  'https://rpc.ankr.com/bsc'
];

// Implement auto-failover
async function getProvider() {
  for (const url of providers) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber(); // Test connectivity
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error('All RPC providers down');
}
```

### Scenario 4: Replay Attack Detected

**Symptoms:**
- Same permit signature submitted multiple times
- `isPermitUsed` returns true unexpectedly
- Users complaining about double charges

**Response:**
1. **Immediate:** Verify permit tracking works correctly
2. **Within 15 min:** Check for contract bug or client issue
3. **Within 30 min:** Refund affected users if legitimate

```javascript
// Check permit status
const isUsed = await facilitator.isPermitUsed(
  owner, spender, value, deadline, v, r, s
);

if (isUsed) {
  console.log('✅ Replay prevention working correctly');
} else {
  console.log('❌ Permit tracking failure - investigate!');
}
```

---

## Maintenance Tasks

### Weekly

- [ ] Withdraw accumulated platform fees (if > $50)
- [ ] Review payment volume trends
- [ ] Check worker wallet distribution
- [ ] Scan for anomalous transactions

### Monthly

- [ ] Rotate worker wallet keys
- [ ] Review gas price trends (adjust if needed)
- [ ] Audit platform fee settings
- [ ] Backup deployment configurations
- [ ] Review security logs

### Quarterly

- [ ] Smart contract security review
- [ ] Evaluate EIP-4337 integration progress
- [ ] Review operational costs vs. revenue
- [ ] Consider Circle native USDC migration
- [ ] Update documentation

---

## Key Metrics Dashboard

### Financial Metrics

```javascript
// Calculate daily revenue
const events = await facilitator.queryFilter('PaymentSettled', startBlock, endBlock);
const totalVolume = events.reduce((sum, e) => sum + e.args.value, 0n);
const totalFees = events.reduce((sum, e) => sum + e.args.platformFee, 0n);

console.log('Daily Volume:', ethers.formatUnits(totalVolume, 6), 'USDC');
console.log('Daily Fees:', ethers.formatUnits(totalFees, 6), 'USDC');
console.log('Transaction Count:', events.length);
```

### Performance Metrics

- **Average settlement time:** < 5 seconds
- **Parallel throughput:** 10x vs sequential
- **Success rate:** > 99%
- **Gas cost per payment:** ~$0.005

### Health Metrics

- **Worker balance variance:** < 30%
- **Failed settlement rate:** < 1%
- **RPC uptime:** > 99.9%
- **Contract interaction success:** > 99%

---

## Escalation Procedures

### Level 1: Normal Operations
**Handler:** Operations team  
**Examples:** Worker refunding, fee withdrawal, monitoring

### Level 2: Service Degradation
**Handler:** Engineering team  
**Examples:** RPC failures, high error rates, slow settlements  
**SLA:** Respond within 30 minutes

### Level 3: Critical Incident
**Handler:** Engineering + Security team  
**Examples:** Contract bug, wallet compromise, data breach  
**SLA:** Respond within 5 minutes

### Level 4: Catastrophic Failure
**Handler:** All hands + external audit  
**Examples:** Contract exploit, major fund loss, chain-wide issue  
**SLA:** Immediate response, 24/7 monitoring

---

## Contact Information

### Internal Team
- **Engineering Lead:** [Contact Info]
- **Operations Manager:** [Contact Info]
- **Security Team:** [Contact Info]

### External Services
- **Binance Support:** https://www.binance.com/en/support
- **BSCScan Support:** https://bscscan.com/contactus
- **Circle (USDC):** https://www.circle.com/en/support

### Emergency Contacts
- **Contract Security:** [Audit Firm Contact]
- **Legal:** [Law Firm Contact]
- **Insurance:** [Policy Contact]

---

## Appendix: Common Commands

### Check Contract Status

```bash
# Get facilitator info
npx hardhat console --network bscMainnet
> const f = await ethers.getContractAt('S402Facilitator', 'ADDRESS');
> await f.platformFeeBps(); // Current fee in bps
> await f.accumulatedFees(); // Total fees collected
> await f.usdc(); // USDC contract address
```

### Fund Workers

```bash
# Transfer USDC to all workers
node scripts/fund-workers.js --amount 100
```

### Sweep Funds

```bash
# Emergency: Return all funds to master
node scripts/sweep-to-master.js
```

### Update Configuration

```bash
# Update platform fee
npx hardhat run scripts/update-platform-fee.js --network bscMainnet

# Transfer ownership
npx hardhat run scripts/transfer-ownership.js --network bscMainnet
```

---

## Changelog

### 2025-10-27 - v5.0.0 Mainnet Launch
- Initial mainnet deployment
- S402Facilitator contract deployed
- Multi-wallet pool operational
- Monitoring dashboard live

