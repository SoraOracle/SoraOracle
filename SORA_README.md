# Sora Oracle MVP - Decentralized Oracle for Prediction Markets

## 🎯 Overview

Sora Oracle is a decentralized oracle system built for prediction markets on BNB Chain. This MVP includes:

- **TWAP Integration** - Price feeds from PancakeSwap V2
- **Multi-Source Answers** - Support for price, yes/no, and general questions  
- **Confidence Scoring** - Answers include confidence levels (0-100%)
- **Prediction Market Ready** - Built-in helpers for market resolution
- **0.01 BNB Standard Fee** - Transparent pricing per question

## 🏗️ Architecture

### Smart Contracts

1. **SoraOracle.sol** - Main oracle contract
   - Handles questions and answers
   - Manages oracle provider rewards
   - Supports multiple question types

2. **PancakeTWAPOracle.sol** - TWAP price feed
   - Time-weighted average prices from PancakeSwap
   - Manipulation-resistant pricing
   - 30-minute minimum update period

3. **SimplePredictionMarket.sol** - Example integration
   - Binary (yes/no) prediction markets
   - Automatic resolution via oracle
   - Winner-takes-all payout model

## 🚀 Quick Start

### 1. Deploy to BSC Testnet

```bash
npm run deploy:sora
```

This will:
- Deploy SoraOracle contract
- Set up TWAP oracles for WBNB/BUSD, WBNB/USDT, CAKE/WBNB
- Display contract addresses

### 2. Ask Questions

```bash
# General question
npx hardhat run scripts/sora-ask.js <ORACLE_ADDRESS> --network bscTestnet

# This will ask 3 example questions:
# - General market sentiment question
# - Price question (can use TWAP)
# - Yes/No prediction question
```

### 3. Provide Answers (Oracle Provider)

```bash
# Answer a general question
npx hardhat run scripts/sora-answer.js <ORACLE_ADDRESS> <QUESTION_ID> general --network bscTestnet

# Answer a price question
npx hardhat run scripts/sora-answer.js <ORACLE_ADDRESS> <QUESTION_ID> price --network bscTestnet

# Answer a yes/no question
npx hardhat run scripts/sora-answer.js <ORACLE_ADDRESS> <QUESTION_ID> yesno --network bscTestnet
```

### 4. Withdraw Earnings

```bash
npx hardhat run scripts/sora-withdraw.js <ORACLE_ADDRESS> --network bscTestnet
```

## 📊 Features

### Question Types

| Type | Description | Use Case |
|------|-------------|----------|
| **GENERAL** | Open-ended questions | Market analysis, sentiment |
| **PRICE** | Price-related queries | Can use TWAP for crypto prices |
| **YESNO** | Binary predictions | Prediction market resolution |
| **NUMERIC** | Numeric answers | Sports scores, statistics |

### Answer Structure

```solidity
struct Answer {
    string textAnswer;        // Human-readable answer
    uint256 numericAnswer;    // Numeric value (for prices, scores)
    bool boolAnswer;          // Boolean (for yes/no)
    uint8 confidenceScore;    // 0-100% confidence
    string dataSource;        // Where data came from
    uint256 timestamp;        // When answered
    address provider;         // Who answered
}
```

### TWAP Price Feeds

Get manipulation-resistant prices from PancakeSwap:

```solidity
// Get TWAP price for WBNB in BUSD
address pairAddress = 0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16;
address WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
uint256 amount = 1 ether; // 1 WBNB

uint256 price = oracle.getTWAPPrice(pairAddress, WBNB, amount);
// Returns amount of BUSD for 1 WBNB
```

## 🔗 Integration Example

### Using Sora Oracle in Your Prediction Market

```solidity
import "./SoraOracle.sol";

contract MyPredictionMarket {
    SoraOracle public oracle;
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    function createMarket(string memory question) external payable {
        uint256 deadline = block.timestamp + 24 hours;
        
        // Ask the oracle
        uint256 questionId = oracle.askYesNoQuestion{value: msg.value}(
            question,
            deadline
        );
        
        // Store questionId for later resolution
    }
    
    function resolveMarket(uint256 questionId) external {
        // Get oracle answer
        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(questionId);
        
        // Use answer.boolAnswer to determine outcome
        bool outcome = answer.boolAnswer;
        uint8 confidence = answer.confidenceScore;
        
        // Resolve your market...
    }
}
```

## 📝 Key Addresses (BSC Testnet)

### PancakeSwap V2
- **Factory:** `0x6725F303b657a9451d8BA641348b6761A6CC7a17`
- **Router:** `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`

### Common Trading Pairs (Mainnet - for reference)
- **WBNB/BUSD:** `0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16`
- **WBNB/USDT:** `0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE`
- **CAKE/WBNB:** `0x0eD7e52944161450477ee417DE9Cd3a859b14fD0`

## 🛠️ What's Included vs Documentation

### ✅ MVP Features (Implemented)

- [x] Multiple question types (general, price, yes/no, numeric)
- [x] TWAP integration for PancakeSwap price feeds
- [x] Confidence scoring system
- [x] Data source tracking
- [x] 0.01 BNB standard fee
- [x] 7-day refund period for unanswered questions
- [x] Oracle provider reward system
- [x] Simple prediction market example
- [x] Security features (ReentrancyGuard, Pausable, Ownable)

### ⚠️ Not in MVP (Future Roadmap)

- [ ] Automated AI research (requires off-chain infrastructure)
- [ ] 30-60 second auto-resolution (needs oracle nodes)
- [ ] Chainlink integration (requires Chainlink subscription)
- [ ] Staking/slashing mechanism (needs governance)
- [ ] ML anomaly detection (needs off-chain compute)
- [ ] Multi-oracle aggregation
- [ ] Dispute resolution system

## 💡 MVP Scope

This MVP focuses on:

1. **Solid Foundation** - Production-ready smart contracts
2. **TWAP Integration** - Real price feed data
3. **Flexible Architecture** - Easy to extend
4. **Manual Oracle** - Oracle provider manually answers (for now)
5. **Security First** - Battle-tested patterns

The documentation describes an enterprise system, but this MVP provides the **core functionality** needed to:
- Ask questions with BNB bounties
- Get answers with confidence scores
- Use TWAP for price data
- Build prediction markets

## 🔒 Security

- **OpenZeppelin v5** - Battle-tested security libraries
- **ReentrancyGuard** - Prevents reentrancy attacks
- **Access Control** - Owner and provider separation
- **Input Validation** - All inputs validated
- **Pausable** - Emergency stop mechanism

## 📈 Gas Costs (BSC Testnet)

- **Deploy SoraOracle:** ~3-5M gas (~$5-8 USD)
- **Ask Question:** ~150k gas (~$0.30 USD)
- **Provide Answer:** ~100k gas (~$0.20 USD)
- **Claim Winnings:** ~50k gas (~$0.10 USD)

## 🎓 Next Steps

1. **Test on Testnet** - Deploy and experiment
2. **Add More Pairs** - Add TWAP oracles for other trading pairs
3. **Build UI** - Create a frontend for your prediction market
4. **Extend Features** - Add more question types or data sources
5. **Deploy to Mainnet** - Once thoroughly tested

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Contract Documentation](./contracts/)
- [Example Scripts](./scripts/)

## ⚡ Quick Commands

```bash
# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:sora

# Ask questions
npm run sora:ask <ADDRESS>

# Provide answers
npm run sora:answer <ADDRESS> <QUESTION_ID> <TYPE>

# Withdraw earnings
npm run sora:withdraw <ADDRESS>
```

---

**Built with ❤️ for BNB Chain prediction markets**
