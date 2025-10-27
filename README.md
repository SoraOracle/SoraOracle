# Sora Oracle SDK v5.0

**Production-ready permissionless oracle SDK with HTTP 402 micropayments on BNB Chain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![BNB Chain](https://img.shields.io/badge/🚀_BNB-Chain-orange.svg)](https://www.bnbchain.org/)

---

## 🎯 What is Sora Oracle?

Sora Oracle is a **fully permissionless oracle SDK** that lets you create prediction markets with trustless data feeds. No centralized oracles, no gatekeepers - just AI-powered API discovery, cryptographic verification, and s402 micropayments.

### Key Features

✅ **Permissionless Oracle** - AI discovers and verifies APIs automatically  
✅ **s402 Micropayments** - HTTP 402 payments using USDC on BNB Chain  
✅ **Multi-Wallet Parallelization** - 10x faster than sequential transactions  
✅ **23 Smart Contracts** - Production-ready market types (binary, multi-outcome, AMM, orderbook, conditional)  
✅ **TypeScript SDK** - React hooks for zero-boilerplate integration  
✅ **Honest Branding** - We use s402 (not x402) and are transparent about our tech  

---

## 🚀 Quick Start

### Install SDK

```bash
npm install @sora-oracle/sdk
```

### Create Your First Market

```typescript
import { SoraOracleSDK } from '@sora-oracle/sdk';

const sdk = new SoraOracleSDK({
  chainId: 56, // BNB Chain Mainnet
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  privateKey: process.env.PRIVATE_KEY
});

// Create a prediction market
const market = await sdk.createMarket({
  question: "Will BTC hit $100k by Dec 31, 2025?",
  type: "binary",
  deadline: "2025-12-31T23:59:59Z",
  payment: {
    token: "USDC",
    amount: "0.05" // $0.05 USDC payment
  }
});

console.log(`Market created: ${market.id}`);
```

---

## 📖 Documentation

### Core Concepts

- **[SORA_ORACLE_TECHNICAL_SPECIFICATION.md](./SORA_ORACLE_TECHNICAL_SPECIFICATION.md)** - Complete architecture and design
- **[V5_PERMISSIONLESS_ORACLE_COMPLETE.md](./V5_PERMISSIONLESS_ORACLE_COMPLETE.md)** - How the permissionless oracle works
- **[USDC_USDT_BNB_CHAIN_IMPLEMENTATION.md](./USDC_USDT_BNB_CHAIN_IMPLEMENTATION.md)** - s402 payment implementation

### Comparison & Analysis

- **[X402_VS_S402_COMPARISON.md](./X402_VS_S402_COMPARISON.md)** - Why we built s402 instead of using x402
- **[EIP_PAYMENT_STANDARDS_COMPARISON.md](./EIP_PAYMENT_STANDARDS_COMPARISON.md)** - EIP-2612 vs EIP-3009 deep-dive
- **[EIP3009_LOOPHOLE_ANALYSIS.md](./EIP3009_LOOPHOLE_ANALYSIS.md)** - Why "EIP-3009 on BNB" claims are false

### Getting Started

- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes
- **[SDK README](./sdk/README.md)** - TypeScript SDK documentation

---

## 🏗️ Architecture

### v5.0: s402 Micropayment Protocol

Sora Oracle v5.0 introduces **s402** - a custom HTTP 402 micropayment system for BNB Chain:

```
User Signs Payment → s402 Middleware Verifies → API Responds → Settlement On-Chain
     (EIP-2612)           (Payment Proof)          (Data)      (Multi-Wallet Pool)
```

**Key Components:**

1. **S402Facilitator.sol** - Smart contract for payment settlement (1% platform fee)
2. **MultiWalletS402Pool** - 10 worker wallets for parallel transactions (10x speedup)
3. **s402-middleware.js** - Backend payment verification
4. **Permissionless Oracle** - AI-powered API discovery and verification

### Why s402 Instead of x402?

**x402 (Coinbase):**
- ✅ Uses EIP-3009 (random nonces, true parallel)
- ❌ Only works on Base, Ethereum (chains with native Circle USDC)
- ❌ Doesn't work on BNB Chain (no EIP-3009 support)

**s402 (Sora):**
- ✅ Uses EIP-2612 (works on BNB Chain)
- ✅ Multi-wallet pool solves sequential nonce problem
- ✅ Achieves 10x parallel speedup
- ✅ Honest branding - we don't claim x402 compliance

**[Read Full Comparison →](./X402_VS_S402_COMPARISON.md)**

---

## 💡 Use Cases

### 1. Permissionless Data Markets

```typescript
// AI automatically discovers and verifies APIs
const oracle = await sdk.createPermissionlessOracle({
  question: "What's the current BTC price?",
  sources: "auto", // AI discovers APIs
  consensus: "median",
  verification: "tls+sha256+ipfs"
});

// Oracle queries multiple sources, verifies cryptographically
const answer = await oracle.query();
console.log(`BTC: $${answer.value} (confidence: ${answer.confidence}%)`);
```

### 2. Prediction Markets with s402

```typescript
// Users pay $0.05 USDC to create markets
const market = await sdk.createMarket({
  question: "Will Ethereum merge happen in Q3?",
  type: "binary",
  payment: { token: "USDC", amount: "0.05" }
});

// Oracle automatically resolves using verified data
await market.resolve(); // AI-powered settlement
```

### 3. Multi-Outcome Markets

```typescript
// Create election markets
const election = await sdk.createMarket({
  question: "Who wins 2024 election?",
  type: "multi-outcome",
  outcomes: ["Candidate A", "Candidate B", "Candidate C"],
  payment: { token: "USDC", amount: "0.10" }
});
```

---

## 🛠️ Smart Contracts

### 23 Production-Ready Contracts

**Core Oracle (v3):**
- **SoraOracle** - Question/answer oracle with bounties
- **PancakeTWAPOracle** - Manipulation-resistant TWAP pricing

**Market Types (v3-v4):**
- **SimplePredictionMarket** - Binary (yes/no) markets
- **MultiOutcomeMarket** - 2-10 outcome markets
- **OrderBookMarket** - Limit order book (institutional-grade)
- **AMMPredictionMarket** - AMM-style liquidity pools
- **ConditionalMarket** - Markets with linked outcomes
- **RangeBettingMarket** - Bet on price ranges
- **TimeSeriesMarket** - Statistical predictions

**Automation (v4):**
- **AutomatedMarketResolver** - AI-powered settlement
- **AggregatedOracle** - Multi-source consensus
- **ScheduledFeeds** - Automated oracle updates
- **CrossChainBridge** - Multi-chain oracle data

**Operations:**
- **BatchOracleOperations** - Batch 20 questions (30% gas savings)
- **BatchPayoutDistributor** - Efficient winner payouts
- **DisputeResolution** - Stake-based challenges
- **OracleReputationTracker** - Provider performance

**Governance:**
- **DAOGovernance** - Community voting
- **OracleStaking** - Reputation and rewards
- **SlashingMechanism** - Penalty system

**Growth:**
- **ReferralRewards** - Viral growth (5% fee sharing)
- **MarketFactory** - Market registry with categories
- **LiquidityIncentives** - Bootstrap new markets

**v5.0 - s402 Payments:**
- **S402Facilitator** - Payment settlement with 1% platform fee

---

## 📊 Pricing

### s402 Operation Costs

| Operation | Price (USDC) | Description |
|-----------|--------------|-------------|
| Data Source Access | $0.03 | Query permissionless oracle |
| Oracle Query | $0.01 | Single oracle question |
| Market Creation | $0.05 | Create prediction market |
| Market Resolution | $0.10 | Resolve market outcome |
| Batch Query | $0.05 | Multiple oracle queries |
| AI Resolution | $0.15 | GPT-4 powered settlement |

**Platform Fee:** 1% of all transactions (adjustable by owner)

---

## 🔒 Security

### Smart Contract Security

- ✅ **OpenZeppelin v5** - Battle-tested libraries
- ✅ **ReentrancyGuard** - All withdrawal functions protected
- ✅ **Pausable** - Emergency stop mechanism
- ✅ **Access Control** - Role-based permissions
- ✅ **Input Validation** - All user inputs sanitized

### s402 Payment Security

- ✅ **EIP-712 Signatures** - Cryptographically secure payment authorizations
- ✅ **Replay Prevention** - Used payment tracking
- ✅ **Recipient Binding** - Payments cryptographically bound to recipient (prevents front-running)
- ✅ **Deadline Enforcement** - All payments have expiration times

**Security Audit:** Contract reviewed and fixed for front-running vulnerabilities before deployment.

**[View Security Fixes →](./EIP3009_LOOPHOLE_ANALYSIS.md#security-fixes)**

---

## 🌊 Gas Costs (BNB Chain)

| Operation | Gas | BNB (3 Gwei) | USD ($600 BNB) |
|-----------|-----|--------------|----------------|
| Create Binary Market | ~200K | ~0.0006 BNB | ~$0.36 |
| Create Multi-Outcome | ~250K | ~0.00075 BNB | ~$0.45 |
| Place Bet | ~50K | ~0.00015 BNB | ~$0.09 |
| Claim Winnings | ~45K | ~0.000135 BNB | ~$0.08 |
| s402 Payment Settlement | ~180K | ~0.00054 BNB | ~$0.32 |
| Batch Oracle Operations | ~35K ea | ~0.000105 BNB | ~$0.06 |

**Total Cost:** ~$0.40 to create + settle a market with s402

---

## 🔗 Network Information

### BNB Chain Mainnet

- **Chain ID:** 56
- **RPC:** https://bsc-dataseed.binance.org/
- **Explorer:** https://bscscan.com
- **USDC:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (Binance-Bridged, EIP-2612)
- **USDT:** `0x55d398326f99059fF775485246999027B3197955` (18 decimals!)

### BNB Chain Testnet

- **Chain ID:** 97
- **RPC:** https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer:** https://testnet.bscscan.com
- **Faucet:** https://testnet.bnbchain.org/faucet-smart

---

## 📦 SDK Reference

### React Hooks

```typescript
import { useWallet, useSoraOracle, usePredictionMarket } from '@sora-oracle/sdk/hooks';

function BettingUI() {
  const { address, connect } = useWallet();
  const { oracleClient, marketClient } = useSoraOracle(config, provider);
  const { market, bet, odds } = usePredictionMarket(marketId, address);
  
  return (
    <div>
      <button onClick={() => bet(true, parseEther('0.1'))}>
        Bet YES at {odds.yes}% odds
      </button>
    </div>
  );
}
```

### Core Clients

```typescript
import { 
  SoraOracleClient,
  PredictionMarketClient,
  MultiOutcomeMarketClient,
  S402Client,
  MultiWalletS402Pool
} from '@sora-oracle/sdk';
```

**[View Full SDK Docs →](./sdk/README.md)**

---

## 🧪 Development

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
node scripts/deploy-v3-testnet.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Access at: http://localhost:5000

---

## 📁 Repository Structure

```
sora-oracle-sdk/
├── contracts/                    # 23 Smart Contracts
│   ├── S402Facilitator.sol       # v5.0 Payment settlement
│   ├── SoraOracle.sol
│   ├── SimplePredictionMarket.sol
│   ├── MultiOutcomeMarket.sol
│   ├── OrderBookMarket.sol
│   └── ... (18 more contracts)
├── src/sdk/                      # TypeScript SDK
│   ├── MultiWalletS402Pool.ts    # v5.0 Parallel transactions
│   ├── S402Client.ts
│   └── ... (core clients)
├── server/                       # Backend
│   ├── s402-middleware.js        # v5.0 Payment verification
│   └── index.js
├── frontend/                     # React UI
│   └── src/
├── scripts/                      # Deployment scripts
├── docs/                         # Documentation
│   ├── SORA_ORACLE_TECHNICAL_SPECIFICATION.md
│   ├── V5_PERMISSIONLESS_ORACLE_COMPLETE.md
│   ├── X402_VS_S402_COMPARISON.md
│   └── ... (more docs)
└── README.md                     # This file
```

---

## 🤝 Contributing

We welcome contributions! This is open-source MIT licensed software.

```bash
# Fork and clone
git clone https://github.com/yourusername/sora-oracle-sdk

# Install and test
npm install && npx hardhat test

# Create feature branch
git checkout -b feature/amazing-feature

# Submit PR
```

---

## 📄 License

**MIT License** - See [LICENSE](./LICENSE) for details.

Use it, fork it, modify it, sell it - whatever you want! All smart contracts are fully permissionless and open source.

---

## 🌟 Why Sora Oracle?

### vs. Traditional Oracles (Chainlink, UMA)

| Feature | Sora Oracle | Chainlink | UMA |
|---------|-------------|-----------|-----|
| **Permissionless** | ✅ Anyone can add data | ❌ Whitelisted nodes | ⚠️ Token voting |
| **AI-Powered** | ✅ GPT-4 discovery | ❌ Manual | ❌ Manual |
| **Micropayments** | ✅ s402 ($0.01-0.15) | ❌ LINK tokens | ❌ UMA bonds |
| **Multi-Source** | ✅ Automatic consensus | ⚠️ Node consensus | ⚠️ Optimistic |
| **BNB Chain** | ✅ Native support | ✅ Supported | ⚠️ Limited |
| **Verification** | ✅ TLS+SHA256+IPFS | ⚠️ Node reputation | ⚠️ Economic game |

### vs. Prediction Market Platforms

| Feature | Sora Oracle | Polymarket | Augur |
|---------|-------------|------------|-------|
| **Chain** | BNB (low fees) | Polygon | Ethereum |
| **Oracle** | Permissionless | Centralized UMA | Decentralized |
| **Market Types** | 8 types | Binary only | Binary + Categorical |
| **Payments** | s402 (USDC) | Free | ETH gas |
| **Orderbook** | ✅ Limit orders | ✅ Limit orders | ❌ Shares only |

---

## 📚 Learn More

### Core Documentation

- **[Technical Specification](./SORA_ORACLE_TECHNICAL_SPECIFICATION.md)** - Complete v5.0 architecture
- **[Permissionless Oracle Guide](./V5_PERMISSIONLESS_ORACLE_COMPLETE.md)** - How AI discovers and verifies APIs
- **[s402 vs x402 Comparison](./X402_VS_S402_COMPARISON.md)** - Why we built our own payment protocol

### Deep Dives

- **[USDC/USDT Implementation](./USDC_USDT_BNB_CHAIN_IMPLEMENTATION.md)** - BNB Chain payment details
- **[EIP Payment Standards](./EIP_PAYMENT_STANDARDS_COMPARISON.md)** - EIP-2612 vs EIP-3009 analysis
- **[EIP-3009 Loopholes](./EIP3009_LOOPHOLE_ANALYSIS.md)** - Why "EIP-3009 on BNB" is impossible

### For Users

- **[Quick Start](./QUICK_START.md)** - Get started in 5 minutes
- **[SDK Documentation](./sdk/README.md)** - Complete SDK reference
- **[Contributing](./CONTRIBUTING.md)** - How to contribute

---

## 💬 Support

- **Email:** soraoracle@proton.me
- **Issues:** [GitHub Issues](https://github.com/yourusername/sora-oracle-sdk/issues)
- **Docs:** See [docs/](./docs/) directory

---

<div align="center">

**Sora Oracle v5.0** - The first production-ready permissionless oracle with integrated micropayments 🚀

✅ Permissionless | ✅ AI-Powered | ✅ s402 Payments | ✅ BNB Chain

No gatekeepers. No permissions. Just secure, verifiable prediction markets.

Built by the community, for the community 🌐

</div>
