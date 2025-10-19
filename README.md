# Sora Oracle - BNB Chain Prediction Market Oracle

A sophisticated oracle system for decentralized prediction markets on BNB Chain, featuring TWAP price feeds, confidence scoring, and multi-source data validation.

## 🚀 What's Built (MVP)

This MVP provides a production-ready oracle system with:

### ✅ Core Features Implemented

1. **SoraOracle Contract** - Main oracle with advanced features:
   - Multiple question types (general, price, yes/no, numeric)
   - Confidence scoring (0-100%)
   - Data source tracking
   - 0.01 BNB standard fee
   - 7-day refund period for unanswered questions
   - Emergency pause functionality

2. **PancakeTWAPOracle** - Price feed integration:
   - Time-weighted average prices from PancakeSwap V2
   - Manipulation-resistant pricing
   - 5-minute update period (auto-updater runs every 5 min)
   - Spot price function for display purposes
   - Supports any PancakeSwap trading pair

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

## 📁 Project Structure

```
contracts/
├── SoraOracle.sol                  # Main oracle contract
├── PancakeTWAPOracle.sol          # TWAP price feed oracle
├── SimplePredictionMarket.sol     # Prediction market helper
└── interfaces/
    ├── IPancakePair.sol           # PancakeSwap pair interface
    └── IPancakeFactory.sol        # PancakeSwap factory interface

scripts/
├── deploy-sora.js                 # Deploy Sora Oracle
├── sora-ask.js                    # Ask questions
├── sora-answer.js                 # Provide answers
├── sora-withdraw.js               # Withdraw earnings
└── update-twap.js                 # Update TWAP oracles

test/
└── SoraOracle.test.js             # Comprehensive test suite
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

- **[SORA_README.md](./SORA_README.md)** - Comprehensive feature guide
- **[TWAP_GUIDE.md](./TWAP_GUIDE.md)** - TWAP vs Spot prices, auto-updater guide
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment instructions
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
