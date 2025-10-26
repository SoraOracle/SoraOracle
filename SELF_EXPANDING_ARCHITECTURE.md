
# Self-Expanding Research Agent Architecture

## The Ultimate Evolution: AI that Discovers Its Own Data Sources

The V5.0 Self-Expanding Research Agent doesn't just use existing APIs—it **autonomously discovers, tests, and registers new APIs** using x402 micropayments. This makes Sora Oracle a **self-evolving prediction market platform**.

---

## The Problem Solved

**Traditional Approach:**
```
New market category → Developer manually finds APIs → Integrates them → Deploys update
Time: Days/weeks
Cost: Developer time
Coverage: Limited to what developers pre-configure
```

**Self-Expanding Approach:**
```
New market category → AI discovers APIs → Tests them → Registers them → Uses them
Time: Seconds
Cost: $0.05-0.15 (one-time discovery)
Coverage: UNLIMITED (anything with an API)
```

---

## How It Works: The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ASKS QUESTION                                              │
│  "Will crude oil prices exceed $100/barrel by Q4 2025?"         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Analyze Question                                       │
│                                                                   │
│  GPT-4 Analysis:                                                 │
│    Category: "energy"                                            │
│    Keywords: ["oil", "crude", "prices", "barrel"]               │
│    Recommended Sources: []  ← EMPTY! No oil APIs exist yet       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Detect Missing Category & INITIATE DISCOVERY           │
│                                                                   │
│  ⚠️  Alert: "Insufficient sources for category: energy"         │
│  🔬 Action: Initiating API Discovery...                          │
│                                                                   │
│  Step 2.1: Generate Search Queries (GPT-4)                       │
│    Queries: ["oil prices API", "crude oil data API",            │
│              "commodity prices API", "energy market API"]        │
│                                                                   │
│  Step 2.2: Search API Directories (with x402 payments!)          │
│                                                                   │
│    RapidAPI Search:                                              │
│      - Pay $0.05 with x402 payment proof                         │
│      - Search for "oil prices API"                               │
│      - Found: OilPriceAPI, CommodityAPI                          │
│                                                                   │
│    APIs.guru Search:                                             │
│      - Pay $0.02 with x402 payment proof                         │
│      - Search for "energy market data"                           │
│      - Found: EIA API (free govt API)                            │
│                                                                   │
│  Total Discovery Cost: $0.07                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Test Discovered APIs                                   │
│                                                                   │
│  Testing OilPriceAPI:                                            │
│    - Endpoint: https://api.oilpriceapi.com/v1                   │
│    - Test request: GET /latest                                   │
│    - Response: {"price": 95.50, "currency": "USD"} ✅           │
│    - Reliability: 92%                                            │
│                                                                   │
│  Testing EIA API:                                                │
│    - Endpoint: https://api.eia.gov/v2                           │
│    - Test request: GET /petroleum/pri/spt/data                  │
│    - Response: {"series": [...]} ✅                             │
│    - Reliability: 95%                                            │
│                                                                   │
│  CommodityAPI:                                                   │
│    - Test failed (timeout) ❌                                   │
│    - Skipped                                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: Register Working APIs                                  │
│                                                                   │
│  ✅ Registered: OilPriceAPI                                      │
│     Categories: [energy, commodities]                            │
│     Cost per call: $0.03                                         │
│     x402 enabled: Yes                                            │
│                                                                   │
│  ✅ Registered: EIA API                                          │
│     Categories: [energy, government]                             │
│     Cost per call: $0.00 (free govt API)                        │
│     x402 enabled: No                                             │
│                                                                   │
│  Registry updated: 9 → 11 APIs                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: Answer Original Question (with new APIs!)              │
│                                                                   │
│  Query OilPriceAPI ($0.03):                                      │
│    Price: $95.50 → NO (below $100) - 89% confidence             │
│                                                                   │
│  Query EIA API ($0.00):                                          │
│    Price: $95.30 → NO (below $100) - 91% confidence             │
│                                                                   │
│  Multi-Source Consensus:                                         │
│    Outcome: NO                                                   │
│    Confidence: 90%                                               │
│    Total Cost: $0.10 (discovery $0.07 + queries $0.03)          │
└─────────────────────────────────────────────────────────────────┘

NEXT TIME user asks about oil:
  → No discovery needed (already registered!)
  → Just query OilPriceAPI + EIA API
  → Cost: $0.03 (90% cheaper!)
```

---

## Real Example: Oil Prices Discovery

### First Question (Discovery)
```typescript
Question: "Will oil prices exceed $100/barrel?"

PHASE 1 - Analysis:
  ❌ No oil price APIs registered
  
PHASE 2 - Discovery:
  🔍 Search RapidAPI ($0.05) → Found OilPriceAPI
  🔍 Search APIs.guru ($0.02) → Found EIA API
  🧪 Test OilPriceAPI → ✅ Works (92% reliability)
  🧪 Test EIA API → ✅ Works (95% reliability)
  
PHASE 3 - Registration:
  ✅ OilPriceAPI registered ($0.03/call)
  ✅ EIA API registered (free)
  
PHASE 4 - Answer:
  📊 OilPriceAPI: NO (89%)
  📊 EIA API: NO (91%)
  Final: NO (90% confidence)
  
Total Cost: $0.10
```

### Second Question (Uses Learned APIs!)
```typescript
Question: "Will oil drop below $80/barrel?"

PHASE 1 - Analysis:
  ✅ Found: OilPriceAPI, EIA API (registered)
  
PHASE 2 - No Discovery Needed!
  
PHASE 3 - Answer:
  📊 OilPriceAPI: YES (87%)
  📊 EIA API: YES (89%)
  Final: YES (88% confidence)
  
Total Cost: $0.03 (70% savings!)
```

---

## API Directory Services (Paid with x402)

The agent searches these directories to discover new APIs:

| Directory | Cost/Search | Coverage | Search Method |
|-----------|-------------|----------|---------------|
| **RapidAPI** | $0.05 | 40,000+ APIs | Keyword search |
| **APIs.guru** | $0.02 | 2,000+ APIs | Open catalog |
| **ProgrammableWeb** | $0.03 | 23,000+ APIs | Category browse |
| **APIList.fun** | $0.01 | 1,400+ curated APIs | Tag search |

**How Payment Works:**
```typescript
// Agent searches RapidAPI
const payment = await x402Client.createPayment('dataSourceAccess'); // $0.05

// Include payment proof in request
const results = await fetch('https://rapidapi.com/search?q=oil+prices', {
  headers: {
    'X-402-Payment': JSON.stringify(payment)
  }
});
```

---

## Discovery Process Details

### Step 1: Generate Search Queries (GPT-4)

```typescript
Input: "Will oil prices exceed $100/barrel?"
Category: "energy"

GPT-4 Prompt:
  "Generate 3-5 search queries to find APIs for energy/oil price data"

Output:
  [
    "oil prices API",
    "crude oil data API",
    "commodity prices API",
    "energy market API"
  ]
```

### Step 2: Search API Directories

```typescript
for each directory (RapidAPI, APIs.guru, etc):
  1. Pay x402 fee ($0.01-0.05)
  2. Submit search queries
  3. Parse results
  4. Extract API metadata:
     - Name
     - Endpoint
     - Description
     - Categories
     - Pricing
     - Authentication method
     - Reliability estimate
```

### Step 3: Test Discovered APIs

```typescript
for each discovered API:
  1. Make test request
  2. Check response validity
  3. Measure response time
  4. Calculate reliability score
  5. Accept if reliability > 75%
```

### Step 4: Register Working APIs

```typescript
router.registerSource({
  name: 'OilPriceAPI',
  endpoint: 'https://api.oilpriceapi.com/v1',
  categories: ['energy', 'commodities'],
  costPerCall: 0.03,
  description: 'Real-time oil and gas price data',
  exampleQuestions: ['Will oil prices exceed $100?'],
  x402Enabled: true
});
```

---

## Cost Economics

### Discovery Cost Breakdown

**One-Time Discovery (New Category):**
- API directory searches: $0.05-0.15
- API testing: $0.00-0.05
- Total: ~$0.10-0.20

**Per-Question Cost (After Discovery):**
- Query discovered APIs: $0.02-0.05
- No discovery overhead

**ROI Analysis:**
```
Discovery: $0.10 (one-time)
Future questions: $0.03 each

Break-even: 3-4 questions
After 10 questions: 70% savings vs. manual integration
```

---

## Categories That Can Be Auto-Discovered

The agent can discover APIs for virtually any category:

### ✅ Currently Registered (Pre-installed)
- Crypto prices (CoinGecko, CryptoCompare)
- Weather (OpenWeatherMap)
- Sports (SportsData)
- News (NewsAPI)
- Social sentiment (TwitterAPI)
- Stocks (AlphaVantage)
- Economics (FRED)
- Real estate (Zillow)

### 🔍 Can Be Auto-Discovered
- **Energy**: Oil, gas, electricity prices
- **Politics**: Election polls, government data
- **Healthcare**: Disease data, medical research
- **Space**: Launches, satellite data
- **Agriculture**: Crop prices, weather impact
- **Transportation**: Flight prices, gas prices
- **Technology**: Product releases, trends
- **Entertainment**: Box office, streaming data
- **Education**: Enrollment, test scores
- **Environment**: Pollution, climate data
- **Finance**: Interest rates, forex
- **Manufacturing**: Production indices
- **Retail**: Sales data, consumer sentiment
- **...and literally anything with a public API!**

---

## Learning Mechanism

The agent tracks API performance over time:

```typescript
API Performance Tracking:
{
  'OilPriceAPI': {
    successCount: 15,
    failureCount: 1,
    avgConfidence: 0.91,
    reliability: 93.75%  // 15/(15+1)
  }
}
```

**How It's Used:**
- Higher reliability = higher weight in consensus
- Consistent failures = deprioritize or remove
- Performance-based routing for future questions

---

## Adding Custom API Directories

Users can register their own API discovery services:

```typescript
agent.registerAPIDirectory({
  name: 'MyPrivateDirectory',
  endpoint: 'https://my-company.com/api-catalog',
  costPerSearch: 0.02,  // Pay with x402
  searchMethod: 'POST',
  categories: ['proprietary', 'internal']
});

// Now agent will search YOUR directory too!
```

**Use Cases:**
- Enterprise internal APIs
- Industry-specific catalogs
- Proprietary data sources
- Partner API networks

---

## Security & Validation

### API Testing Protocol
```typescript
1. Endpoint validation (valid URL)
2. Authentication test (if required)
3. Response format check (valid JSON/XML)
4. Data quality assessment (GPT-4 review)
5. Performance test (< 5s response time)
6. Cost verification (within budget)
```

### Registration Criteria
```typescript
API must pass:
✅ Reliability score > 75%
✅ Response time < 5 seconds
✅ Valid authentication method
✅ Reasonable pricing (< $0.10/call)
✅ Relevant to question category
✅ No security red flags
```

---

## Integration with Prediction Markets

### Full Flow: Question → Discovery → Resolution

```typescript
// User creates market
const market = await sdk.createMarket({
  question: 'Will oil exceed $100/barrel?',
  useTokenFactory: false
});

// Resolution time arrives
const result = await agent.researchMarket(market.question);

// Result includes:
{
  outcome: false,              // NO
  confidence: 0.90,            // 90%
  sources: ['OilPriceAPI', 'EIA API'],
  discoveryPerformed: true,    // New APIs discovered!
  newSourcesAdded: 2,          // 2 APIs registered
  totalCost: 0.10              // $0.10 (discovery + queries)
}

// Resolve market on-chain
await sdk.resolveMarket({
  marketId: market.id,
  outcome: result.outcome,
  payment: x402Proof
});

// Future oil markets = instant resolution (no discovery)
```

---

## Comparison: Manual vs Self-Expanding

| Aspect | Manual Integration | Self-Expanding Agent |
|--------|-------------------|---------------------|
| **New Category Support** | Developer codes integration | Automatic discovery |
| **Time to Support** | Days/weeks | Seconds |
| **Developer Effort** | High (code, test, deploy) | Zero |
| **Coverage** | Limited to pre-configured | Unlimited (any API) |
| **Cost (first time)** | Developer time | $0.10-0.20 |
| **Cost (subsequent)** | Same | $0.02-0.05 (90% cheaper) |
| **Maintenance** | Manual updates needed | Self-updating |
| **Scalability** | Linear (1 dev per category) | Exponential (learns forever) |

---

## Real-World Scenarios

### Scenario 1: New Industry (ESG/Sustainability)
```
User: "Will company X meet ESG targets?"

Agent:
  1. No ESG APIs registered
  2. Searches RapidAPI → Finds SustainabilityAPI
  3. Tests it → Works!
  4. Registers it
  5. Answers question using new API
  6. Future ESG questions = instant

Cost: $0.12 first time, $0.03 after
```

### Scenario 2: Government Data
```
User: "Will unemployment exceed 5%?"

Agent:
  1. Has FRED (Federal Reserve data)
  2. Searches for Bureau of Labor Stats API
  3. Finds BLS API (free govt data)
  4. Registers it
  5. Now uses both FRED + BLS for consensus

Cost: $0.05 discovery, then free queries
```

### Scenario 3: Niche Markets
```
User: "Will rare earth metal prices rise?"

Agent:
  1. No metals APIs
  2. Discovers MetalsAPI, LondonMetalExchange
  3. Registers both
  4. Enables entirely new market category!

Unlocks: All future metals/commodities markets
```

---

## Future Enhancements

### 1. AI-Generated API Wrappers
```typescript
// If API doesn't support x402, agent generates wrapper
agent.createAPIWrapper('OilPriceAPI', {
  addX402: true,
  caching: true,
  rateLimiting: true
});
```

### 2. Community API Submissions
```typescript
// Users submit working APIs, agent validates
communityAPI = {
  name: 'MyCustomOilAPI',
  endpoint: '...',
  submittedBy: '0x123...'
};

agent.validateCommunityAPI(communityAPI);
// If valid → reward submitter with tokens
```

### 3. Cross-Chain Oracle Discovery
```typescript
// Discover oracles on other blockchains
agent.discoverChainlinkFeeds('ethereum', 'oil prices');
agent.discoverBandProtocol('polygon', 'weather');
```

### 4. Reputation-Based Routing
```typescript
// Track which APIs give accurate results
// Prioritize high-reputation sources
// Demote or remove unreliable ones
```

---

## Technical Architecture

### File Structure
```
src/ai/
  ├── DataSourceRouter.ts          // GPT-4 routing logic
  ├── IntelligentResearchAgent.ts  // Multi-source consensus
  ├── APIDiscoveryAgent.ts         // Discovery engine (NEW!)
  └── SelfExpandingResearchAgent.ts // Complete integration (NEW!)

examples/
  ├── intelligent-research-demo.ts  // Shows intelligent routing
  └── self-expanding-demo.ts        // Shows auto-discovery (NEW!)
```

### Dependencies
- **GPT-4**: Question analysis + search query generation
- **x402**: Payments for API directory searches
- **ethers.js**: Blockchain integration
- **Node.js fetch**: HTTP requests to directories

---

## Summary: Why This Is Revolutionary

**Before V5.0:**
- Prediction markets limited to pre-configured categories
- Adding new markets requires developer work
- Coverage: ~10 categories (crypto, weather, sports, etc.)

**After V5.0:**
- Prediction markets for ANYTHING with an API
- Zero developer work for new categories
- Coverage: UNLIMITED (self-expanding)

**The Breakthrough:**
```
Traditional Oracle: Answers pre-defined questions
Self-Expanding Oracle: Learns how to answer NEW questions
```

**Real-World Impact:**
- Day 1: 9 APIs (crypto, weather, stocks, etc.)
- Day 30: 50+ APIs (discovered oil, elections, healthcare, etc.)
- Day 90: 200+ APIs (covers every major industry)
- Day 365: 1000+ APIs (truly universal prediction market)

**The agent literally expands itself by using x402 to pay for API discovery!**

---

**Files:**
- `src/ai/APIDiscoveryAgent.ts` - API discovery with x402 payments
- `src/ai/SelfExpandingResearchAgent.ts` - Complete self-expanding system
- `examples/self-expanding-demo.ts` - Live demonstration
- `SELF_EXPANDING_ARCHITECTURE.md` - This document

**Cost:** $0.10-0.20 per category discovered (one-time), then $0.02-0.05 per question  
**ROI:** Pays for itself after 3-4 questions per category  
**Potential:** Unlimited market coverage with ZERO developer intervention

🚀 **This is how prediction markets go from niche to universal!**
