# Coinbase x402-express Integration Guide

**Package:** `x402-express` v0.6.5  
**Source:** https://github.com/coinbase/x402  
**Status:** ✅ Installed, ❌ Not Yet Integrated

---

## 📦 **What Is x402-express?**

Official Coinbase implementation of the x402 payment protocol for Express.js apps.

**Key Features:**
- ✅ Express middleware for payment protection
- ✅ Built-in paywall UI (React-based)
- ✅ Facilitator integration (x402.org)
- ✅ Coinbase CDP integration for onramp
- ✅ Multi-network support (Base, Base Sepolia)
- ✅ Viem-based signature verification

---

## 🔍 **How Real x402-express Works**

### **1. Express Middleware Pattern**

```typescript
import { paymentMiddleware } from 'x402-express';

// Configure protected routes
app.use(paymentMiddleware(
  '0xYourAddress',              // Where payments go
  {
    '/api/data': {
      price: '$0.01',            // $0.01 USDC
      network: 'base-sepolia',
      config: {
        description: 'API access'
      }
    }
  },
  {
    url: 'https://x402.org/facilitator'  // Payment facilitator
  }
));

// Your protected route
app.get('/api/data', (req, res) => {
  res.json({ data: 'secret info' });
});
```

---

### **2. Payment Flow**

```
1. User requests /api/data
   ↓
2. Middleware checks for X-402-Payment header
   ↓
3. No payment? Return 402 with paywall HTML
   ↓
4. User pays via built-in wallet UI
   ↓
5. Payment verified with facilitator
   ↓
6. Request proceeds to route handler
```

---

### **3. Built-in Paywall**

x402-express includes a React-based paywall that:
- Connects to MetaMask/Coinbase Wallet
- Shows payment amount and description
- Handles USDC transfer
- Retries request with payment proof
- Integrates Coinbase Onramp (optional)

**No custom UI needed!**

---

## 🆚 **Our Custom vs. Real x402-express**

| Feature | Our Custom | Real x402-express |
|---------|------------|-------------------|
| **Signature Generation** | ✅ Works (ethers.js) | ✅ Works (viem) |
| **Signature Verification** | ✅ Works (local) | ✅ Works (facilitator) |
| **Nonce Tracking** | ✅ In-memory Map | ✅ Facilitator-managed |
| **Payment Settlement** | ❌ Bypassed | ✅ Via facilitator |
| **Paywall UI** | ❌ None | ✅ Built-in React UI |
| **Express Middleware** | ✅ Custom | ✅ Official |
| **SDK Pattern** | ✅ Client+Middleware | ❌ Middleware-only |
| **Multi-network** | ⚠️ Config-based | ✅ Built-in |
| **CDP Integration** | ❌ None | ✅ Onramp support |

---

## 🎯 **Integration Strategy**

### **Option 1: Full Replacement (Recommended)**

Replace our custom implementation entirely:

```typescript
// BEFORE (Our Custom):
import { X402Client } from '../src/sdk/X402Client';
import { X402Middleware } from '../src/middleware/x402';

// AFTER (Real x402-express):
import { paymentMiddleware } from 'x402-express';
```

**Pros:**
- ✅ Official Coinbase support
- ✅ Real facilitator integration
- ✅ Built-in paywall UI
- ✅ Tested and maintained

**Cons:**
- ⚠️ Different API pattern
- ⚠️ Requires refactoring AI agents
- ⚠️ Less SDK-style, more middleware-style

---

### **Option 2: Hybrid Adapter (Pragmatic)**

Keep our SDK pattern but use x402-express internally:

```typescript
// Adapter that wraps x402-express for our SDK
export class X402Client {
  constructor(config) {
    this.middleware = paymentMiddleware(
      config.payTo,
      config.routes,
      config.facilitator
    );
  }

  // Expose SDK-style methods
  async createPayment(operation) {
    // Use x402-express internally
    return this.middleware.createProof(...);
  }
}
```

**Pros:**
- ✅ Minimal refactoring
- ✅ Keep our SDK API
- ✅ Use real x402 under the hood

**Cons:**
- ⚠️ Extra abstraction layer
- ⚠️ May not expose all x402 features

---

## 🚀 **Recommended Implementation**

### **Step 1: Server-Side (Express)**

```typescript
// server/index.ts
import express from 'express';
import { paymentMiddleware } from 'x402-express';

const app = express();

// Configure x402 payment protection
app.use(paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS as `0x${string}`,
  {
    // AI Research endpoints
    '/api/ai/research': {
      price: '$0.02',
      network: 'base-sepolia',
      config: {
        description: 'AI-powered market research',
        maxTimeoutSeconds: 60
      }
    },
    // Market creation
    '/api/createMarket': {
      price: '$0.05',
      network: 'base-sepolia',
      config: {
        description: 'Create prediction market'
      }
    },
    // Market resolution
    '/api/resolveMarket': {
      price: '$0.10',
      network: 'base-sepolia',
      config: {
        description: 'Resolve market with AI oracle'
      }
    }
  },
  {
    // Use x402.org facilitator for testnet
    url: 'https://x402.org/facilitator'
  },
  {
    // Optional: Coinbase Onramp for easy USDC purchases
    cdpClientKey: process.env.CDP_CLIENT_KEY,
    appName: 'Sora Oracle',
    appLogo: '/logo.png'
  }
));

// Your routes (now payment-protected)
app.post('/api/createMarket', async (req, res) => {
  // Payment already verified by middleware
  const marketData = req.body;
  // ... create market
});
```

---

### **Step 2: Client-Side (Frontend)**

```typescript
// frontend/src/utils/api.ts

// x402 payments handled by browser wallet
// No custom client needed - middleware serves paywall

async function createMarket(marketData) {
  const response = await fetch('/api/createMarket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(marketData)
  });

  if (response.status === 402) {
    // x402-express automatically serves paywall HTML
    // User sees wallet UI, pays, request auto-retries
    const html = await response.text();
    // Display in modal or new window
    document.body.innerHTML = html;
    return;
  }

  return response.json();
}
```

---

### **Step 3: AI Agents (Backend)**

For AI agents making internal API calls:

```typescript
// src/ai/SelfExpandingResearchAgent.ts
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export class SelfExpandingResearchAgent {
  private walletClient;

  constructor(privateKey: string) {
    this.walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: baseSepolia,
      transport: http()
    });
  }

  async callProtectedAPI(endpoint: string, data: any) {
    // Option 1: Use wallet to pay
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response.status === 402) {
      // Parse 402 response, create payment, retry
      const paymentDetails = await response.json();
      // ... handle payment
    }

    return response.json();
  }
}
```

---

## 📋 **Migration Checklist**

### **Phase 1: Replace Server Middleware**
- [ ] Import `paymentMiddleware` from 'x402-express'
- [ ] Remove custom `X402Middleware` class
- [ ] Configure routes with pricing
- [ ] Set facilitator URL
- [ ] Test with curl/Postman

### **Phase 2: Update SDK (If Keeping SDK Pattern)**
- [ ] Create adapter wrapping x402-express
- [ ] Maintain existing API surface
- [ ] Update examples
- [ ] Test SDK usage

### **Phase 3: Frontend Integration**
- [ ] Handle 402 responses
- [ ] Display paywall UI
- [ ] Test wallet connections
- [ ] Add Onramp (optional)

### **Phase 4: AI Agents**
- [ ] Add wallet clients for agents
- [ ] Implement payment flow
- [ ] Handle 402 responses
- [ ] Test end-to-end

---

## 🔑 **Environment Variables Needed**

```bash
# Payment recipient (your address)
PAYMENT_RECIPIENT_ADDRESS=0x...

# x402 Facilitator (testnet)
X402_FACILITATOR_URL=https://x402.org/facilitator

# Optional: Coinbase CDP for Onramp
CDP_CLIENT_KEY=your_cdp_client_key
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret

# Network
NETWORK=base-sepolia
```

---

## 💰 **Pricing Configuration**

Current pricing in our code:
```typescript
createMarket: $0.05
placeBet: $0.01
resolveMarket: $0.10
aiResearch: $0.02
dataSourceAccess: $0.03
```

Maps to x402-express:
```typescript
{
  '/api/createMarket': { price: '$0.05', network: 'base-sepolia' },
  '/api/placeBet': { price: '$0.01', network: 'base-sepolia' },
  '/api/resolveMarket': { price: '$0.10', network: 'base-sepolia' },
  '/api/ai/research': { price: '$0.02', network: 'base-sepolia' },
  '/api/data/*': { price: '$0.03', network: 'base-sepolia' }
}
```

---

## 🧪 **Testing Strategy**

### **Development Mode**
```typescript
// x402-express supports test mode
if (process.env.NODE_ENV === 'development') {
  // Use test facilitator
  facilitator: {
    url: 'https://x402.org/facilitator'  // Testnet facilitator
  }
}
```

### **Testing Without Real Payments**
1. Use Base Sepolia testnet
2. Get test USDC from faucet
3. Test full payment flow
4. Verify with facilitator

---

## 🎓 **Resources**

**Official Docs:**
- x402 Protocol: https://x402.org
- GitHub: https://github.com/coinbase/x402
- Examples: https://github.com/coinbase/x402/tree/main/examples

**Coinbase CDP:**
- Portal: https://portal.cdp.coinbase.com
- Onramp Docs: https://docs.cdp.coinbase.com/onramp/docs

---

## 🚨 **Breaking Changes**

### **From Our Custom to Real x402-express:**

**1. No More X402Client Class**
```typescript
// ❌ BEFORE:
const client = new X402Client({ ... });
const payment = await client.createPayment('createMarket');

// ✅ AFTER:
// Middleware handles everything
app.use(paymentMiddleware(...));
```

**2. Different Payment Proof Format**
Our custom format won't work with real facilitator.

**3. Nonce Management**
Facilitator manages nonces, not local Map.

**4. Signature Format**
x402-express uses viem signing, we used ethers.js.

---

## ✅ **Next Steps**

1. **Document current usage** - Where do we use X402Client/X402Middleware?
2. **Create migration plan** - Phase by phase replacement
3. **Build adapter** - Temporary compatibility layer
4. **Test thoroughly** - Ensure no regressions
5. **Deploy to testnet** - Real facilitator testing

---

**Ready to integrate?** I can help with any of these phases.
