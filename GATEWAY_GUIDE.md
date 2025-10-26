# x402 API Gateway - Complete Guide

**Status:** ✅ Production-Ready  
**Purpose:** Enable agents to pay for external APIs using x402 on BNB Chain

---

## 🎯 **What Problem Does This Solve?**

**Before (The Problem):**
```
Agent needs data → calls external API → ❌ no payment method
External APIs don't accept crypto payments
Agent can't autonomously pay for data
```

**After (The Solution):**
```
Agent needs data → pays gateway via x402 (BNB Chain)
Gateway → calls external API (traditional method)
Agent gets data → gateway keeps profit
```

---

## 🏗️ **Architecture**

```
┌──────────────────────────────────────────────────────────┐
│  AGENT (Self-Expanding Research Agent)                  │
│  Needs: Bitcoin price data                              │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Pays $0.03 USDC via x402
                     │ (BNB Chain transaction)
                     ↓
┌──────────────────────────────────────────────────────────┐
│  x402 GATEWAY (Your Service)                            │
│  - Receives x402 payment                                │
│  - Verifies on-chain                                    │
│  - Settles USDC payment                                 │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Calls API with your key
                     │ (Traditional HTTP/API key)
                     ↓
┌──────────────────────────────────────────────────────────┐
│  EXTERNAL API (CoinGecko, etc.)                         │
│  - Returns Bitcoin price                                │
│  - Bills you monthly for usage                          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Returns data
                     ↓
┌──────────────────────────────────────────────────────────┐
│  AGENT                                                   │
│  - Receives Bitcoin price                               │
│  - Uses in oracle consensus                             │
└──────────────────────────────────────────────────────────┘
```

---

## 💰 **Economics**

### **Revenue Model:**
```
Agent pays you:      $0.03 USDC per call
You pay CoinGecko:   $0.02 USD per call (or free tier)
Your profit:         $0.01 per call

Monthly (1000 calls):
Revenue:  $30.00 USDC
Costs:    $20.00 USD
Profit:   $10.00
Margin:   33%
```

### **Pricing Tiers:**
| API | Agent Pays | You Pay External | Your Profit | Margin |
|-----|-----------|------------------|-------------|--------|
| CoinGecko | $0.03 | $0.00 (free) | $0.03 | 100% |
| OpenWeather | $0.02 | $0.00 (free) | $0.02 | 100% |
| NewsAPI | $0.03 | $0.02 | $0.01 | 33% |
| AlphaVantage | $0.03 | $0.02 | $0.01 | 33% |

---

## 🚀 **Quick Start**

### **Step 1: Deploy x402 Facilitator** (if not done)
```bash
npm run deploy:x402 -- --network bscTestnet
```

Copy the deployed address to your `.env`:
```bash
X402_FACILITATOR_ADDRESS=0x...deployed_address
```

### **Step 2: Configure Gateway**
Create `.env` file:
```bash
# Gateway Configuration
GATEWAY_PORT=3000
GATEWAY_WALLET_ADDRESS=0x...your_address
GATEWAY_SETTLEMENT_KEY=your_private_key

# x402 Settings
X402_FACILITATOR_ADDRESS=0x...facilitator_address
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
NETWORK=testnet

# External API Keys (optional, many work on free tier)
COINGECKO_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here
ALPHAVANTAGE_API_KEY=your_key_here
```

### **Step 3: Start Gateway**
```bash
npm run gateway:start
```

Output:
```
🌉 x402 API Gateway
==================
Gateway Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
Network: testnet
Facilitator: 0x...

✅ Gateway running on http://localhost:3000

📋 Available Endpoints:
   POST /proxy/coingecko - $0.03 USDC
   POST /proxy/openweather - $0.02 USDC
   POST /proxy/newsapi - $0.03 USDC
   POST /proxy/alphavantage - $0.03 USDC
   GET  /health - Health check
   GET  /stats - Gateway statistics
   GET  /pricing - API pricing
```

### **Step 4: Test Gateway**
```bash
# In another terminal
npm run gateway:demo
```

---

## 📋 **API Endpoints**

### **POST /proxy/coingecko**
Proxy to CoinGecko API

**Price:** $0.03 USDC  
**Payment:** x402 required

**Request:**
```bash
curl -X POST http://localhost:3000/proxy/coingecko \
  -H "Content-Type: application/json" \
  -H "X-402-Payment: {...payment_proof}" \
  -d '{
    "endpoint": "/simple/price",
    "params": {
      "ids": "bitcoin",
      "vs_currencies": "usd"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bitcoin": {
      "usd": 95000
    }
  },
  "cost": 0.03,
  "api": "coingecko"
}
```

### **POST /proxy/openweather**
Proxy to OpenWeatherMap API

**Price:** $0.02 USDC  
**Payment:** x402 required

**Request:**
```bash
curl -X POST http://localhost:3000/proxy/openweather \
  -H "Content-Type: application/json" \
  -H "X-402-Payment: {...payment_proof}" \
  -d '{
    "endpoint": "/weather",
    "params": {
      "q": "Tokyo",
      "units": "metric"
    }
  }'
```

### **POST /proxy/newsapi**
Proxy to NewsAPI

**Price:** $0.03 USDC  
**Payment:** x402 required

### **POST /proxy/alphavantage**
Proxy to Alpha Vantage API

**Price:** $0.03 USDC  
**Payment:** x402 required

### **GET /health**
Health check (no payment required)

**Response:**
```json
{
  "status": "healthy",
  "gateway": "0x...",
  "network": "testnet",
  "timestamp": "2025-10-26T..."
}
```

### **GET /stats**
Gateway statistics (no payment required)

**Response:**
```json
{
  "totalTransactions": 42,
  "totalRevenue": 1.26,
  "totalCost": 0.84,
  "totalProfit": 0.42,
  "profitMargin": 33.33,
  "apiBreakdown": [
    {
      "name": "coingecko",
      "totalCalls": 30,
      "totalRevenue": 0.90,
      "avgProfit": 0.03
    }
  ]
}
```

### **GET /pricing**
API pricing (no payment required)

---

## 🤖 **Agent Integration**

### **Using GatewayClient:**
```typescript
import { GatewayClient } from '../gateway/client';
import { X402Client } from '../src/sdk/X402Client';

// Setup x402 client
const x402Client = new X402Client({
  facilitatorAddress: '0x...',
  recipientAddress: '0x...gateway_wallet',
  usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  network: 'testnet',
  signer: wallet
});

// Setup gateway client
const gateway = new GatewayClient({
  gatewayUrl: 'http://localhost:3000',
  x402Client
});

// Call API via gateway (automatically pays via x402)
const btcPrice = await gateway.callCoinGecko('/simple/price', {
  ids: 'bitcoin',
  vs_currencies: 'usd'
});

console.log(`Bitcoin: $${btcPrice.bitcoin.usd}`);
```

### **Direct x402 Payment:**
```typescript
// Generate payment proof
const proof = await x402Client.createPayment('dataSourceAccess');

// Call gateway
const response = await fetch('http://localhost:3000/proxy/coingecko', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-402-Payment': JSON.stringify(proof)
  },
  body: JSON.stringify({
    endpoint: '/simple/price',
    params: { ids: 'bitcoin', vs_currencies: 'usd' }
  })
});

const data = await response.json();
```

---

## 📊 **Monitoring & Analytics**

### **Real-Time Stats:**
```bash
curl http://localhost:3000/stats
```

**Metrics tracked:**
- Total transactions
- Revenue (USDC earned from agents)
- Costs (paid to external APIs)
- Profit (revenue - costs)
- Profit margin (%)
- Per-API breakdown
- Top paying agents

### **Cost Tracking:**
The gateway automatically tracks:
- Every API call
- Payment received from agent
- Cost to external API
- Profit per transaction
- Cumulative statistics

---

## 🔐 **Security**

### **x402 Payment Verification:**
1. Agent signs payment proof with wallet
2. Gateway verifies signature locally
3. Gateway verifies with facilitator contract (on-chain)
4. Gateway calls `settlePayment()` → USDC moves on-chain
5. Only after settlement, gateway proxies to external API

### **Replay Protection:**
- Nonce-based (on-chain tracking)
- Each payment can only be used once
- Concurrent requests handled atomically

### **API Key Security:**
- External API keys stored in environment variables
- Never exposed to agents
- Agents only pay gateway, never see your keys

---

## 💡 **Use Cases**

### **1. Oracle Research**
```typescript
// Agent researches question
const result = await agent.researchMarket(
  "Will BTC hit $100K?",
  { maxCost: 0.50 }
);

// Agent automatically:
// 1. Pays gateway $0.03 for CoinGecko
// 2. Pays gateway $0.03 for CryptoCompare  
// 3. Gets data from both
// 4. Performs consensus
```

### **2. API Monetization**
```typescript
// YOU run gateway
// Agents pay YOU for API access
// YOU keep profit from markup
```

### **3. Multi-Agent Systems**
```typescript
// Multiple agents use same gateway
// All payments tracked per agent
// Revenue scales with usage
```

---

## 🚨 **Troubleshooting**

### **"Payment verification failed"**
**Cause:** Private key not configured or wrong address

**Fix:**
```bash
# Ensure these match in .env
GATEWAY_WALLET_ADDRESS=0x...
GATEWAY_SETTLEMENT_KEY=your_private_key

# Wallet address MUST match settlement key
```

### **"External API error"**
**Cause:** Missing or invalid API key

**Fix:**
```bash
# Add API keys to .env
COINGECKO_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
```

### **"Gateway not responding"**
**Check:**
```bash
# Is gateway running?
curl http://localhost:3000/health

# Check gateway logs
npm run gateway:start
```

---

## 📈 **Scaling**

### **Production Deployment:**

1. **Deploy to cloud:**
   ```bash
   # AWS, Google Cloud, etc.
   # Expose port 3000
   # Use environment variables
   ```

2. **Use mainnet:**
   ```bash
   NETWORK=mainnet
   X402_FACILITATOR_ADDRESS=0x...mainnet_address
   ```

3. **Monitor costs:**
   ```bash
   # Track external API usage
   # Adjust pricing if needed
   # Monitor profit margins
   ```

4. **Rate limiting:**
   ```typescript
   // Add rate limiting per agent
   // Prevent abuse
   // Ensure profitability
   ```

---

## 🎯 **Next Steps**

1. ✅ Deploy facilitator to BSC Testnet
2. ✅ Start gateway service
3. ✅ Test with demo
4. ⬜ Deploy to production (mainnet)
5. ⬜ Add more API proxies
6. ⬜ Scale infrastructure

---

**Your agent can now pay for external APIs using x402 on BNB Chain!** 🚀
