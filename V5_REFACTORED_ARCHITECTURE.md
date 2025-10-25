# V5.0 Refactored Architecture - Optional Token Factory + x402 Everywhere

## Overview

V5.0 has been completely refactored to provide:
1. **Optional Token Factory** - Users choose whether to mint tokens or use traditional markets
2. **x402 on Every Operation** - All SDK calls require micropayments
3. **AI Research Agent** - Uses x402 to pay for external data sources

## Architecture Changes

### 1. Token Factory is Now OPTIONAL

**Before (V5.0 initial):**
- Every market automatically minted a token
- Token factory was mandatory

**After (V5.0 refactored):**
- Markets can be created WITH or WITHOUT tokens
- `useTokenFactory` flag in SDK
- Traditional parimutuel markets still available
- Token markets for viral growth

**Example:**
```typescript
// Traditional market (no token)
await sdk.createMarket({
  question: 'Will BTC reach $100K?',
  oracleFeed: '0x...',
  resolutionTime: timestamp,
  useTokenFactory: false  // Traditional
});

// Token market (with ERC-20)
await sdk.createMarket({
  question: 'Will ETH reach $10K?',
  oracleFeed: '0x...',
  resolutionTime: timestamp,
  useTokenFactory: true,  // Mint token
  tokenSupply: '1000000000'
});
```

### 2. x402 Micropayments on ALL SDK Operations

Every SDK operation now requires an x402 micropayment:

| Operation | Cost | Purpose |
|-----------|------|---------|
| `createMarket()` | $0.05 | Prevent spam markets |
| `placeBet()` | $0.01 | Prevent spam bets |
| `resolveMarket()` | $0.10 | Cover AI research costs |
| AI Research | $0.02 | Per research call |
| Data Source Access | $0.03 | Per external API call |

**Implementation:**
```typescript
// SDK automatically generates x402 payment proofs
const market = await sdk.createMarket({ ... });
// Under the hood:
// 1. Generates x402 payment proof ($0.05 USDC)
// 2. Signs with user's wallet
// 3. Includes in transaction
// 4. Smart contract verifies payment
```

### 3. AI Research Agent with x402 Data Access

The AI Research Agent uses x402 to pay for external data sources:

**Supported Data Sources:**
- **CoinGecko** - Crypto price data ($0.02/call)
- **CryptoCompare** - Market data ($0.03/call)
- **NewsAPI** - News sentiment ($0.02/call)
- **Twitter API** - Social sentiment ($0.05/call)

**Example:**
```typescript
const aiAgent = new AIResearchAgent(x402Client);

const research = await aiAgent.researchMarket(
  'Will BTC reach $100K by EOY?',
  oracleFeed,
  {
    maxCost: 0.25,        // Max $0.25 spend
    minConfidence: 0.8,   // Need 80% confidence
    preferredSources: ['CoinGecko', 'CryptoCompare', 'NewsAPI']
  }
);

// Result:
// - Outcome: true/false
// - Confidence: 0.85
// - Sources used: CoinGecko, CryptoCompare
// - Total cost: $0.05
// - Reasoning: "3/3 sources indicate positive..."
```

## New SDK Structure

### Core Classes

**1. X402Client**
- Generates payment proofs
- Manages pricing tiers
- Verifies signatures
- Handles nonce tracking

**2. PredictionMarketSDK**
- Main SDK interface
- Integrates x402 payments
- Optional token factory
- All market operations

**3. AIResearchAgent**
- AI-powered market resolution
- x402-enabled data source access
- Multi-source aggregation
- Confidence scoring

**4. TokenFactory** (Optional)
- Deploy ERC-20 tokens
- Oracle validation
- Metadata export

### File Structure

```
src/
├── sdk/
│   ├── X402Client.ts           # NEW: Micropayment client
│   ├── PredictionMarketSDK.ts  # NEW: Main SDK with x402
│   └── TokenFactory.ts         # REFACTORED: Optional
├── ai/
│   └── AIResearchAgent.ts      # NEW: AI with x402 data access
├── middleware/
│   └── x402.ts                 # Server-side verification
└── utils/
    └── nonceStore.ts           # Replay protection

contracts/
├── PredictionMarketV5.sol      # UPDATED: Optional token minting
└── TokenFactory.sol            # Unchanged

examples/
└── sdk-usage.ts                # NEW: Complete SDK examples
```

## Use Cases

### Use Case 1: Traditional Market (No Token)

**Who:** Casual prediction markets  
**Cost:** $0.05 to create + $0.01 per bet  
**Example:** "Will it rain tomorrow?"

```typescript
const market = await sdk.createMarket({
  question: 'Will it rain in NYC tomorrow?',
  oracleFeed: weatherOracleAddress,
  resolutionTime: tomorrow,
  useTokenFactory: false  // No token needed
});
```

### Use Case 2: Viral Token Market

**Who:** Community-driven markets  
**Cost:** $0.05 to create + token deployment  
**Example:** "BTC-100K" prediction with tradeable tokens

```typescript
const market = await sdk.createMarket({
  question: 'Will BTC reach $100K by EOY?',
  oracleFeed: btcOracleAddress,
  resolutionTime: endOfYear,
  useTokenFactory: true,      // Mint BTC100K token
  tokenSupply: '1000000000'   // 1B tokens
});
```

### Use Case 3: AI-Powered Settlement

**Who:** High-stakes markets needing accuracy  
**Cost:** $0.10 resolution + $0.02-$0.10 data costs  
**Example:** Complex market requiring multiple data sources

```typescript
const aiAgent = new AIResearchAgent(x402Client);

// AI researches across multiple APIs
const research = await aiAgent.researchMarket(
  'Will ETH 2.0 launch by Q3?',
  oracleFeed,
  { maxCost: 0.25, minConfidence: 0.9 }
);

// Resolve with high-confidence result
await sdk.resolveMarket({
  marketId: 1,
  useAI: true  // Uses research results
});
```

## Benefits of Refactored Architecture

### 1. Flexibility
✅ Choose token factory when needed  
✅ Traditional markets still available  
✅ No forced overhead

### 2. Cost Efficiency
✅ Pay only for features you use  
✅ Micropayments prevent spam  
✅ AI research = pay for accuracy

### 3. Quality Control
✅ $0.05 barrier filters low-quality markets  
✅ x402 on bets prevents bot spam  
✅ AI verification ensures accurate settlements

### 4. Scalability
✅ x402 payments scale across instances  
✅ Data sources pay per use  
✅ No API key management needed

## Migration from V5.0 Initial

**If you built on early V5.0:**

1. **Token Factory is now optional:**
```typescript
// Old (forced token)
await sdk.createMarket(name, supply, oracle);

// New (choose)
await sdk.createMarket({
  ...,
  useTokenFactory: false // or true
});
```

2. **All operations now require x402:**
```typescript
// SDK handles automatically
// Just ensure USDC approval
```

3. **AI research is available:**
```typescript
// New capability
const research = await aiAgent.researchMarket(...);
```

## Cost Breakdown Examples

### Example 1: Simple Market

**Traditional market, 10 bets, manual resolution**

- Create market: $0.05
- 10 bets @ $0.01: $0.10
- Resolution: $0.10
- **Total: $0.25**

### Example 2: Viral Token Market

**Token market, 100 bets, AI resolution**

- Create market: $0.05
- Token deployment: (gas only, ~$2)
- 100 bets @ $0.01: $1.00
- AI resolution: $0.10
- Data sources: $0.06
- **Total: $1.21 + gas**

### Example 3: High-Stakes Market

**Token market, 1000 bets, multi-source AI**

- Create market: $0.05
- Token deployment: (gas only, ~$2)
- 1000 bets @ $0.01: $10.00
- AI resolution: $0.10
- Data sources (5 APIs): $0.15
- **Total: $10.30 + gas**

## Security Features

### x402 Replay Protection
- Atomic nonce claiming
- Pending → confirmed lifecycle
- Automatic cleanup
- Multi-instance safe

### Token Factory Validation
- Oracle feed verification
- Supply limits (uint256)
- Duplicate prevention
- Gas optimization

### AI Research Safety
- Budget limits per operation
- Confidence thresholds
- Multi-source aggregation
- Payment tracking

## Next Steps

1. ✅ SDK refactored with optional token factory
2. ✅ x402 integrated into all operations
3. ✅ AI Research Agent with data source payments
4. 🔜 Deploy to testnet
5. 🔜 Community testing
6. 🔜 Mainnet launch

---

**V5.0 is now flexible, scalable, and AI-powered! 🚀**
