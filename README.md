# Sora Oracle SDK - Permissionless & Open Source

**A fully permissionless, open-source oracle SDK for BNB Chain**

Anyone can use any PancakeSwap pair. No gatekeepers. No permissions needed. Just plug in and build.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Permissionless](https://img.shields.io/badge/Access-Permissionless-green.svg)]()
[![Open Source](https://img.shields.io/badge/Source-Open-blue.svg)]()

## 🌐 What Makes This Different

### Fully Permissionless
- ✅ **Anyone** can query **any** PancakeSwap pair - no whitelist
- ✅ **Anyone** can create TWAP oracles for new tokens
- ✅ **Anyone** can build prediction markets on top
- ✅ **No approval needed** - just start using it

### Open Source SDK
- 📖 MIT License - fork it, modify it, use it commercially
- 🛠️ Build your own prediction markets, price feeds, DeFi protocols
- 🤝 Community-driven development
- 🔍 Fully transparent and auditable

## 🚀 What's Built

This open-source SDK provides:

### ✅ Core Features Implemented

1. **SoraOracle Contract** - Main oracle with advanced features:
   - Multiple question types (general, price, yes/no, numeric)
   - Confidence scoring (0-100%)
   - Data source tracking
   - 0.01 BNB standard fee
   - 7-day refund period for unanswered questions
   - Emergency pause functionality

2. **PancakeTWAPOracle** - Permissionless price feeds:
   - **Works with ANY PancakeSwap V2 pair** - no whitelist!
   - Auto-creates TWAP oracle on first query
   - Manipulation-resistant (5-min TWAP)
   - Spot price for display (real-time)
   - Anyone can add their token

3. **SimplePredictionMarket** - Example integration:
   - Binary (yes/no) prediction markets
   - Automatic resolution via oracle
   - 2% platform fee
   - Winner-takes-all payout model

4. **Comprehensive Tooling**:
   - Deployment scripts for testnet/mainnet
   - Interaction scripts (ask, answer, withdraw)
   - TWAP update utilities
   - Full test suite (21 tests passing)

## 📁 Repository Structure

```
sora-oracle-sdk/
├── contracts/              # Smart contracts
│   ├── SoraOracle.sol
│   ├── PancakeTWAPOracle.sol
│   ├── SimplePredictionMarket.sol
│   └── interfaces/
├── scripts/               # Deployment & utilities
│   ├── deploy-sora.js
│   ├── auto-update-twap.js
│   └── ...
├── examples/              # Integration examples
│   ├── prediction-markets/
│   │   ├── basic-market.sol
│   │   └── price-prediction-market.sol
│   ├── integrations/
│   │   ├── defi-lending.sol
│   │   └── integrate-any-token.js
│   └── utilities/
│       └── price-alerts.js
├── docs/                  # Documentation
│   ├── SDK_GUIDE.md
│   ├── BOOTSTRAP_GUIDE.md
│   └── ...
└── test/                  # Test suite (21 tests)
```

## 🎯 Quick Start

### 1. Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your PRIVATE_KEY and other settings
```

### 2. Deploy to BSC Testnet

```bash
npm run deploy:sora
```

This deploys SoraOracle and sets up TWAP oracles for major pairs (WBNB/BUSD, WBNB/USDT, CAKE/WBNB).

### 3. Start Auto-Updater (Updates TWAP every 5 min)

```bash
# Add SORA_ORACLE_ADDRESS to .env first
npm run sora:auto-update
```

The auto-updater will continuously update TWAP prices every 5 minutes for all configured pairs.

### 4. Check Prices (TWAP + Spot)

```bash
npm run sora:prices
```

Shows both manipulation-resistant TWAP prices (for settlements) and spot prices (for display).

### 5. Ask Questions

```bash
npm run sora:ask <ORACLE_ADDRESS>
```

### 6. Provide Answers (Oracle Provider)

```bash
npm run sora:answer <ORACLE_ADDRESS> <QUESTION_ID> <TYPE>
# Types: general, price, yesno
```

### 7. Withdraw Earnings

```bash
npm run sora:withdraw <ORACLE_ADDRESS>
```

## 📖 Documentation

- **[SDK Guide](./docs/SDK_GUIDE.md)** - **START HERE** - How to integrate the SDK
- **[Bootstrap Guide](./docs/BOOTSTRAP_GUIDE.md)** - **IMPORTANT** - Bootstrap mode explained
- **[Feature Guide](./docs/SORA_README.md)** - Comprehensive feature documentation
- **[TWAP Guide](./docs/TWAP_GUIDE.md)** - TWAP vs Spot prices, auto-updater
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Deploy your own instance
- **[Examples](./examples/README.md)** - Prediction markets, DeFi integrations, utilities
- **[Test Suite](./test/SoraOracle.test.js)** - 21 passing tests

## 🔧 Available Commands

```bash
npm run compile          # Compile contracts
npm run test             # Run test suite
npm run deploy:sora      # Deploy to BSC testnet
npm run sora:auto-update # Start TWAP auto-updater (every 5 min)
npm run sora:prices      # Check TWAP & spot prices
npm run sora:ask         # Ask questions
npm run sora:answer      # Provide answers
npm run sora:withdraw    # Withdraw earnings
```

## 💡 Key Features

### Question Types

| Type | Use Case | Example |
|------|----------|---------|
| **GENERAL** | Market analysis, sentiment | "What is the market sentiment for BNB?" |
| **PRICE** | Crypto prices (can use TWAP) | "What is the BNB price in BUSD?" |
| **YESNO** | Binary predictions | "Will BNB hit $700 in 24 hours?" |
| **NUMERIC** | Sports scores, statistics | "How many active wallets?" |

### Answer Structure

Every answer includes:
- **Text Answer** - Human-readable explanation
- **Numeric Value** - For prices/scores
- **Boolean** - For yes/no questions
- **Confidence Score** - 0-100%
- **Data Source** - "TWAP", "Market-Analysis", etc.
- **Timestamp** - When answered
- **Provider Address** - Who answered

### TWAP Integration

Get manipulation-resistant prices from PancakeSwap:

```solidity
// Example: Get TWAP price for 1 WBNB in BUSD
uint256 price = oracle.getTWAPPrice(
    0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16, // WBNB/BUSD pair
    0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, // WBNB address
    1 ether  // 1 WBNB
);
```

## 🔒 Security Features

- **OpenZeppelin v5** - Battle-tested security libraries
- **ReentrancyGuard** - Protection against reentrancy attacks
- **Access Control** - Owner and provider separation
- **Input Validation** - All inputs validated
- **Pausable** - Emergency stop mechanism
- **Refund Protection** - Can't drain via double-refund

## 📊 Gas Costs (BSC)

| Action | Approx. Gas | Cost* |
|--------|------------|-------|
| Deploy SoraOracle | 3-5M | $5-8 |
| Ask Question | 150k | $0.30 |
| Provide Answer | 100k | $0.20 |
| Withdraw | 50k | $0.10 |
| Add TWAP Oracle | 2M | $4 |

*Based on 5 gwei gas price and $600 BNB

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

```bash
# Fork and clone
git clone https://github.com/yourusername/sora-oracle-sdk

# Install and test
npm install && npm test

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and test
npm test

# Submit PR
```

## 🧪 Testing

All 21 tests passing:

```bash
npm test
```

Tests cover:
- ✅ Deployment
- ✅ Asking questions (all types)
- ✅ Providing answers
- ✅ Refund mechanism
- ✅ Withdrawals
- ✅ Admin functions
- ✅ Access control
- ✅ Edge cases

## 🌐 Network Information

### BSC Testnet
- **RPC:** https://data-seed-prebsc-1-s1.binance.org:8545
- **Chain ID:** 97
- **Explorer:** https://testnet.bscscan.com
- **Faucet:** https://testnet.bnbchain.org/faucet-smart

### BSC Mainnet
- **RPC:** https://bsc-dataseed.binance.org/
- **Chain ID:** 56
- **Explorer:** https://bscscan.com

## 🛠️ Integration Example

```solidity
pragma solidity ^0.8.20;

import "./SoraOracle.sol";

contract MyPredictionMarket {
    SoraOracle public oracle;
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    function createMarket(string memory question) external payable {
        uint256 fee = oracle.oracleFee();
        require(msg.value >= fee, "Insufficient fee");
        
        uint256 deadline = block.timestamp + 24 hours;
        uint256 questionId = oracle.askYesNoQuestion{value: fee}(
            question,
            deadline
        );
        
        // Store questionId for later resolution
    }
    
    function resolveMarket(uint256 questionId) external {
        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(questionId);
        
        bool outcome = answer.boolAnswer;
        uint8 confidence = answer.confidenceScore;
        
        // Use outcome to resolve your market
    }
}
```

## ⚠️ MVP Scope

### ✅ Implemented
- TWAP price feeds from PancakeSwap
- Multi-question types with confidence scores
- Oracle provider reward system
- Prediction market integration
- Security best practices

### 🚧 Not in MVP (Future)
- Automated AI research (requires off-chain infrastructure)
- 30-60 second resolution (needs oracle nodes)
- Chainlink integration (requires subscription)
- Staking/slashing (needs governance)
- Multi-oracle aggregation

## 📝 License

MIT

---

**Built for BNB Chain Prediction Markets** 🚀

See [SORA_README.md](./SORA_README.md) for complete feature documentation.
