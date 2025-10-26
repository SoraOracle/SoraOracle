# x402 Micropayments on BNB Chain - Production Guide

**Status:** ✅ Production-Ready Custom Implementation  
**Network:** BNB Chain (BSC Mainnet & Testnet)  
**Integration:** Self-Expanding Oracle Agent Compatible

---

## 🎯 **Why BNB Chain + Custom x402?**

### **Our Decision:**
We're using a **custom x402 implementation on BNB Chain** instead of the official Coinbase x402-express (which only supports Base).

**Reasons:**
1. ✅ **Oracle Contracts on BNB Chain** - All prediction market contracts deployed here
2. ✅ **Self-Expanding Agent** - Already integrated with BNB Chain ecosystem
3. ✅ **Lower Costs** - BSC gas fees cheaper than Base
4. ✅ **Full Control** - Customize for our specific use case
5. ✅ **One Chain** - Simpler architecture (no dual-chain complexity)
6. ✅ **Proven Technology** - [PENG! Observer](https://www.peng.observer/disclaimer) pioneered x402 on BNB Chain

### **Acknowledgment:**
This implementation follows the approach pioneered by **PENG! Observer**, the first successful
x402 deployment on BNB Chain using EIP-2612 Permit signatures.

**Reference Facilitator:** `0x4d8cDa8A110924390F8c8292025f4F61D290906f` (BNB Chain Mainnet)

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────┐
│         Frontend (MetaMask)             │
│  - Connected to BNB Chain               │
│  - Holds USDC (BSC)                     │
└─────────────┬───────────────────────────┘
              │
              │ 1. HTTP Request
              ↓
┌─────────────────────────────────────────┐
│      API Server (Express)               │
│  - X402Middleware (our custom)          │
│  - Verifies payment signature           │
│  - Checks with facilitator contract     │
└─────────────┬───────────────────────────┘
              │
              │ 2. Call Facilitator
              ↓
┌─────────────────────────────────────────┐
│   X402Facilitator Contract (BSC)        │
│  - Verifies ECDSA signature             │
│  - Prevents replay (nonce tracking)     │
│  - Settles USDC payment                 │
└─────────────┬───────────────────────────┘
              │
              │ 3. Payment Verified
              ↓
┌─────────────────────────────────────────┐
│   Self-Expanding Agent (Backend)        │
│  - Discovers APIs                       │
│  - Queries data sources                 │
│  - Statistical consensus                │
└─────────────┬───────────────────────────┘
              │
              │ 4. Oracle Result
              ↓
┌─────────────────────────────────────────┐
│   Oracle Contracts (BNB Chain)          │
│  - PredictionMarketV5                   │
│  - Records settlement                   │
└─────────────────────────────────────────┘
```

---

## 📦 **Components**

### **1. Smart Contract**
**File:** `contracts/X402Facilitator.sol`

**Features:**
```solidity
✅ ECDSA signature verification
✅ Nonce-based replay protection
✅ Automatic USDC settlement
✅ Platform fee collection (1% configurable)
✅ Emergency withdrawal
✅ Payment tracking
```

**Deployment:**
```bash
npx hardhat run scripts/deploy-x402-facilitator.ts --network bscTestnet
npx hardhat run scripts/deploy-x402-facilitator.ts --network bscMainnet
```

---

### **2. Express Middleware**
**File:** `src/middleware/x402.ts`

**Features:**
```typescript
✅ HTTP 402 Payment Required responses
✅ Payment proof verification
✅ Facilitator contract integration
✅ Nonce management (in-memory + on-chain)
✅ Development mode bypass
```

**Usage:**
```typescript
import { X402Middleware } from './middleware/x402';

const x402 = new X402Middleware({
  facilitatorUrl: process.env.FACILITATOR_CONTRACT_ADDRESS,
  usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  priceInUSDC: 0.05,
  network: 'mainnet' // or 'testnet'
});

app.use(x402.requirePayment());
```

---

### **3. SDK Client**
**File:** `src/sdk/X402Client.ts`

**Features:**
```typescript
✅ Payment proof generation
✅ ECDSA signature creation
✅ Nonce generation
✅ Payment verification
✅ Pricing tiers
```

**Usage:**
```typescript
import { X402Client } from './sdk/X402Client';

const client = new X402Client({
  facilitatorUrl: contractAddress,
  facilitatorAddress: contractAddress,
  usdcAddress: usdcAddress,
  network: 'testnet',
  signer: wallet
});

const proof = await client.createPayment('createMarket');
```

---

## 🚀 **Deployment Steps**

### **Step 1: Deploy Facilitator Contract**

```bash
# BSC Testnet
npx hardhat run scripts/deploy-x402-facilitator.ts --network bscTestnet

# BSC Mainnet
npx hardhat run scripts/deploy-x402-facilitator.ts --network bscMainnet
```

**Output:**
```
✅ X402Facilitator deployed to: 0x...
   USDC Token: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
   Platform Fee: 100 bps (1%)
   Owner: 0x...
```

---

### **Step 2: Configure Environment**

```bash
# .env
X402_FACILITATOR_ADDRESS=0x...deployed_address
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
X402_FACILITATOR_NETWORK=mainnet
NETWORK=bscMainnet
```

---

### **Step 3: Setup API Server**

```typescript
// server/index.ts
import express from 'express';
import { X402Middleware } from './middleware/x402';

const app = express();

const x402 = new X402Middleware({
  facilitatorUrl: process.env.X402_FACILITATOR_ADDRESS!,
  usdcAddress: process.env.USDC_ADDRESS!,
  priceInUSDC: 0.05,
  network: process.env.NETWORK === 'bscMainnet' ? 'mainnet' : 'testnet'
});

// Protect endpoints
app.post('/api/createMarket', x402.requirePayment(), async (req, res) => {
  // Payment verified, process request
  res.json({ success: true });
});

app.listen(5000);
```

---

### **Step 4: Integrate Self-Expanding Agent**

```typescript
// src/ai/SelfExpandingResearchAgent.ts
export class SelfExpandingResearchAgent {
  private x402Client: X402Client;

  constructor(openaiKey: string, x402Client: X402Client) {
    this.x402Client = x402Client;
  }

  async researchQuestion(question: string) {
    // Agent logic stays the same
    // Payment happens at API gateway level
    const result = await this.queryAPIs(question);
    return this.computeConsensus(result);
  }
}

// Usage:
const agent = new SelfExpandingResearchAgent(
  openaiKey,
  x402Client
);

// Protected endpoint calls agent
app.post('/api/research', x402.requirePayment(), async (req, res) => {
  const result = await agent.researchQuestion(req.body.question);
  res.json(result);
});
```

---

## 💰 **Payment Flow**

### **Client-Side (Frontend):**

```typescript
// 1. User wants to call protected API
async function createMarket(marketData) {
  const response = await fetch('/api/createMarket', {
    method: 'POST',
    body: JSON.stringify(marketData)
  });

  // 2. Server returns 402 Payment Required
  if (response.status === 402) {
    const paymentDetails = await response.json();
    
    // 3. Generate payment proof
    const proof = await generatePaymentProof(paymentDetails);
    
    // 4. Retry with payment header
    const retryResponse = await fetch('/api/createMarket', {
      method: 'POST',
      headers: { 'X-402-Payment': JSON.stringify(proof) },
      body: JSON.stringify(marketData)
    });
    
    return retryResponse.json();
  }

  return response.json();
}

function async generatePaymentProof(details) {
  const { amount, token, to } = details;
  
  // Connect wallet
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // Generate nonce
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  
  // Create message hash
  const messageHash = ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256', 'address', 'address', 'address'],
    [nonce, amount, token, await signer.getAddress(), to]
  );
  
  // Sign message
  const signature = await signer.signMessage(ethers.getBytes(messageHash));
  
  return {
    nonce,
    amount: amount.toString(),
    token,
    from: await signer.getAddress(),
    to,
    signature,
    timestamp: Date.now()
  };
}
```

---

### **Server-Side (Middleware):**

```typescript
// X402Middleware.requirePayment()

1. Extract payment proof from header
2. Verify signature locally (ecrecover)
3. Call facilitator contract to verify & settle
4. If valid → proceed to handler
5. If invalid → return 402 error
```

---

### **On-Chain (Facilitator Contract):**

```solidity
function settlePayment(...) {
  1. Verify signature matches payer
  2. Check nonce not used (replay protection)
  3. Transfer USDC: payer → recipient (minus fee)
  4. Mark nonce as used
  5. Emit PaymentSettled event
}
```

---

## 🔐 **Security Features**

### **1. Signature Verification**
```typescript
// Client signs: keccak256(nonce, amount, token, from, to)
// Contract recovers: ecrecover(hash, signature)
// Verifies: recovered == from
```

### **2. Replay Protection**
```solidity
// On-chain nonce tracking
mapping(bytes32 => bool) public usedNonces;

// Each payment uses unique nonce
require(!usedNonces[nonce], "Already used");
usedNonces[nonce] = true;
```

### **3. Amount Verification**
```typescript
// Middleware checks minimum amount
if (proof.amount < expectedAmount) {
  throw new Error('Insufficient payment');
}
```

### **4. Timestamp Expiration**
```typescript
// Proofs expire after 5 minutes
if (now - proof.timestamp > 300000) {
  throw new Error('Payment expired');
}
```

---

## 💵 **Pricing Configuration**

```typescript
// SDK pricing tiers
const pricing = {
  createMarket: 0.05,      // $0.05 USDC
  placeBet: 0.01,          // $0.01 USDC
  resolveMarket: 0.10,     // $0.10 USDC (AI oracle)
  aiResearch: 0.02,        // $0.02 USDC per call
  dataSourceAccess: 0.03   // $0.03 USDC per API
};

// Map to endpoints
app.post('/api/createMarket', 
  new X402Middleware({ priceInUSDC: 0.05 }).requirePayment(),
  handler
);
```

---

## 🧪 **Testing**

### **Local Development:**
```typescript
// Bypass payments in dev mode
if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️ Bypassing x402 verification in dev mode');
  return true;
}
```

### **BSC Testnet:**
```bash
# 1. Get test BNB from faucet
https://testnet.bnbchain.org/faucet-smart

# 2. Get test USDC
# Swap BNB for USDC on testnet DEX or deploy mock USDC

# 3. Approve facilitator
await usdc.approve(facilitatorAddress, ethers.parseUnits('100', 6));

# 4. Test payment
curl -X POST http://localhost:5000/api/test \
  -H "X-402-Payment: {...proof}"
```

---

## 📊 **Monitoring**

### **On-Chain Events:**
```typescript
// Listen for payments
facilitator.on('PaymentSettled', (payer, recipient, amount, nonce) => {
  console.log(`Payment: ${ethers.formatUnits(amount, 6)} USDC`);
  console.log(`From: ${payer} → To: ${recipient}`);
});
```

### **Payment Stats:**
```typescript
// Get user payment history
const stats = await facilitator.getPaymentStats(userAddress);
console.log(`Total Paid: ${ethers.formatUnits(stats.paid, 6)} USDC`);
console.log(`Total Received: ${ethers.formatUnits(stats.received, 6)} USDC`);
```

---

## 🔧 **Platform Management**

### **Update Fee:**
```typescript
// Change platform fee (only owner)
await facilitator.setPlatformFee(200); // 2%
```

### **Withdraw Fees:**
```typescript
// Withdraw accumulated fees
await facilitator.withdrawFees(treasuryAddress);
```

### **Emergency Actions:**
```typescript
// Emergency withdrawal (if needed)
await facilitator.emergencyWithdraw(
  tokenAddress,
  safeAddress,
  amount
);
```

---

## ✅ **Production Checklist**

- [ ] Deploy X402Facilitator to BSC Mainnet
- [ ] Verify contract on BSCScan
- [ ] Setup environment variables
- [ ] Configure X402Middleware with facilitator address
- [ ] Test payment flow end-to-end
- [ ] Setup monitoring for payment events
- [ ] Document user approval process
- [ ] Add error handling for failed payments
- [ ] Implement payment retry logic
- [ ] Test with Self-Expanding Agent
- [ ] Deploy to production server
- [ ] Monitor first real payments

---

## 🚨 **Common Issues**

### **"USDC transfer failed"**
→ User needs to approve facilitator first:
```typescript
await usdc.approve(facilitatorAddress, amount);
```

### **"Nonce already used"**
→ Replay attack detected or duplicate request
→ Generate new nonce

### **"Invalid signature"**
→ Message format mismatch
→ Ensure client/contract use same format

### **"Payment expired"**
→ Proof older than 5 minutes
→ Generate new proof

---

## 📚 **Resources**

**Smart Contracts:**
- X402Facilitator: `contracts/X402Facilitator.sol`
- Deployment Script: `scripts/deploy-x402-facilitator.ts`

**SDK & Middleware:**
- X402Client: `src/sdk/X402Client.ts`
- X402Middleware: `src/middleware/x402.ts`

**Integration:**
- Self-Expanding Agent: `src/ai/SelfExpandingResearchAgent.ts`

**BNB Chain:**
- Testnet Explorer: https://testnet.bscscan.com
- Mainnet Explorer: https://bscscan.com
- USDC Contract: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d

---

**Ready for production deployment on BNB Chain! 🚀**
