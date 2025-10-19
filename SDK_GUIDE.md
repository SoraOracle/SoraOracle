# Sora Oracle SDK - Open Source & Permissionless

## 🌐 Decentralized Oracle SDK

Sora Oracle is a **fully permissionless, open-source SDK** for prediction markets on BNB Chain. Anyone can use it, integrate it, or fork it - no gatekeepers, no permissions needed.

## 🔓 Key Principles

### 1. Permissionless
- ✅ **Anyone** can query any PancakeSwap pair
- ✅ **Anyone** can create TWAP oracles for new pairs
- ✅ **Anyone** can ask questions (just pay 0.01 BNB fee)
- ✅ **Anyone** can build on top of it

### 2. Open Source
- 📖 All code is MIT licensed
- 🔍 Fully transparent and auditable
- 🛠️ Fork it, modify it, improve it
- 🤝 Community-driven development

### 3. Decentralized
- 🌍 No central authority
- 🔐 Non-custodial (users control their funds)
- ⛓️ Runs entirely on-chain
- 🚫 No admin backdoors (except pause for emergencies)

## 🚀 Quick Integration

### For Developers: Use Any Token Pair

```solidity
// Import the SDK
import "./SoraOracle.sol";

contract YourPredictionMarket {
    SoraOracle public oracle;
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    // Use ANY PancakeSwap pair - auto-creates TWAP oracle!
    function getTokenPrice(address pairAddress, address token) external returns (uint256) {
        // No setup needed - just query any pair
        return oracle.getTWAPPrice(pairAddress, token, 1 ether);
    }
    
    // Create prediction market for any token
    function createMarket(address pairAddress, uint256 targetPrice) external {
        // Get current TWAP price
        uint256 currentPrice = oracle.getTWAPPrice(pairAddress, WBNB, 1 ether);
        
        // Create market: Will price hit target?
        // ... your logic here
    }
}
```

### For Users: Query Any Pair

```javascript
// Connect to deployed oracle
const oracle = await ethers.getContractAt("SoraOracle", ORACLE_ADDRESS);

// Query ANY PancakeSwap pair - auto-creates TWAP if needed!
const pairAddress = "0xYourCustomPairAddress";
const token = "0xYourTokenAddress";
const amount = ethers.parseEther("1");

// First call auto-creates TWAP oracle (costs ~2M gas)
const price = await oracle.getTWAPPrice(pairAddress, token, amount);
console.log(`Price: ${ethers.formatEther(price)}`);

// Subsequent calls just read the price (cheap!)
const price2 = await oracle.getTWAPPrice(pairAddress, token, amount);
```

## 📊 Permissionless TWAP Oracles

### How It Works

1. **First Query:** Auto-creates TWAP oracle for that pair
2. **Subsequent Queries:** Uses existing TWAP oracle
3. **Updates:** Anyone can call `update()` on any oracle

### Example: Add Your Token

```javascript
// Option 1: Lazy creation (auto-creates on first query)
const price = await oracle.getTWAPPrice(yourPairAddress, yourToken, amount);

// Check if TWAP is ready (5+ min of data)
const twap = await oracle.twapOracles(yourPairAddress);
const isReady = await twap.canConsult();

if (isReady) {
    console.log("Using TWAP (manipulation-resistant) ✅");
    // Safe for settlements
} else {
    console.log("Using spot price (bootstrap mode) ⚠️");
    // Display only - wait for TWAP before settlements
}

// Option 2: Explicit creation (if you want to initialize first)
await oracle.addTWAPOracle(yourPairAddress);
// Wait 5 minutes, then call twap.update()
```

### Find Your Pair Address

```javascript
// PancakeSwap Factory
const FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const factory = await ethers.getContractAt("IPancakeFactory", FACTORY);

// Get pair address for any two tokens
const pairAddress = await factory.getPair(token0, token1);
console.log("Your pair:", pairAddress);
```

## 🏗️ Build Anything

### Prediction Markets
```solidity
contract TokenPredictionMarket {
    function willReachPrice(address token, uint256 target) external {
        // Use Sora Oracle for any token pair
        uint256 currentPrice = oracle.getTWAPPrice(pair, token, 1e18);
        // Create market...
    }
}
```

### Price Alerts
```solidity
contract PriceAlert {
    function checkAlert(address pair, address token, uint256 threshold) external {
        uint256 price = oracle.getTWAPPrice(pair, token, 1e18);
        if (price > threshold) {
            emit AlertTriggered(token, price);
        }
    }
}
```

### Trading Bots
```javascript
// Monitor any token price
setInterval(async () => {
    const price = await oracle.getTWAPPrice(pair, token, amount);
    if (price < buyThreshold) {
        executeTrade();
    }
}, 5 * 60 * 1000); // Every 5 minutes
```

### DeFi Protocols
```solidity
contract LendingProtocol {
    function getCollateralValue(address token) external returns (uint256) {
        // Use TWAP for liquidation price
        return oracle.getTWAPPrice(tokenPair, token, collateralAmount);
    }
}
```

## 🔧 Integration Patterns

### Pattern 1: Direct Integration

```solidity
import "./SoraOracle.sol";

contract MyDApp {
    SoraOracle public oracle;
    
    constructor() {
        // Use deployed instance
        oracle = SoraOracle(0xDeployedOracleAddress);
    }
}
```

### Pattern 2: Fork & Customize

```bash
git clone https://github.com/yourusername/sora-oracle
cd sora-oracle

# Modify contracts as needed
# Deploy your own instance
npm run deploy:sora
```

### Pattern 3: Multi-Oracle

```solidity
contract AggregatedOracle {
    SoraOracle public soraOracle;
    // Add other oracles...
    
    function getAveragePrice() external returns (uint256) {
        uint256 soraPrice = soraOracle.getTWAPPrice(pair, token, amount);
        // Average with other sources...
    }
}
```

## 📖 SDK Reference

### Core Functions

```solidity
// Get TWAP price (auto-creates oracle if needed)
function getTWAPPrice(address pair, address token, uint256 amount) 
    external returns (uint256);

// Add TWAP oracle explicitly (optional)
function addTWAPOracle(address pair) external;

// Ask oracle question
function askYesNoQuestion(string question, uint256 deadline) 
    external payable returns (uint256 questionId);

// Get answer
function getQuestionWithAnswer(uint256 questionId) 
    external view returns (Question, Answer);
```

### Helper Functions

```solidity
// Get spot price (display only - can be manipulated!)
twapOracle.getCurrentPrice(token, amount);

// Get TWAP price (settlement - manipulation-resistant)
twapOracle.consult(token, amount);

// Check if oracle needs update
twapOracle.canUpdate();

// Update TWAP oracle
twapOracle.update();
```

## 🌟 Why Permissionless?

### For Users
- 🚀 No approval needed - use any token
- ⚡ Instant access to price feeds
- 🆓 No registration or KYC
- 🔓 True ownership of interactions

### For Developers
- 🛠️ Build without restrictions
- 🔌 Plug-and-play integration
- 📈 Scale without bottlenecks
- 🌐 Composable with other DeFi

### For the Ecosystem
- 🌱 Permissionless innovation
- 🤝 Community-driven growth
- 🔍 Transparent and auditable
- 🌍 Truly decentralized

## 💻 Example Projects

### Meme Coin Prediction Market
```javascript
// Anyone can create predictions for any meme coin
const memeCoinPair = await factory.getPair(MEMECOIN, WBNB);
const price = await oracle.getTWAPPrice(memeCoinPair, MEMECOIN, 1e18);

// Create market: Will it 100x?
await market.create("Will this meme coin reach $0.001?", targetPrice);
```

### NFT Floor Price Tracker
```javascript
// Track any NFT project's floor price token
const nftTokenPair = await factory.getPair(NFTTOKEN, WBNB);
const floorPrice = await oracle.getTWAPPrice(nftTokenPair, NFTTOKEN, 1e18);
```

### DeFi Yield Optimizer
```solidity
contract YieldOptimizer {
    function getBestYield() external returns (address) {
        // Compare multiple token prices via oracle
        uint256 priceA = oracle.getTWAPPrice(pairA, tokenA, 1e18);
        uint256 priceB = oracle.getTWAPPrice(pairB, tokenB, 1e18);
        // Return best opportunity...
    }
}
```

## 🔐 Security Notes

### Bootstrap Period (Important!)

**New oracles need 5 minutes of data before TWAP is ready:**

```javascript
// First query auto-creates oracle
const price = await oracle.getTWAPPrice(pair, token, amount);

// Check which mode
const twap = await oracle.twapOracles(pair);
const ready = await twap.canConsult();

if (ready) {
    // TWAP ready - manipulation-resistant ✅
    // Safe for settlements, liquidations, etc.
} else {
    // Bootstrap mode - using spot price ⚠️
    // Display only - DO NOT use for financial settlements!
}
```

**See [BOOTSTRAP_GUIDE.md](./BOOTSTRAP_GUIDE.md) for details.**

### What's Permissionless
- ✅ Adding any PancakeSwap pair
- ✅ Querying any pair price
- ✅ Asking oracle questions
- ✅ Building on top of the SDK

### What's Protected
- 🔒 Answering questions (oracle provider only)
- 🔒 Withdrawing oracle fees (provider only)
- 🔒 Emergency pause (owner only - for security)
- 🔒 Updating oracle provider (owner only)

### Why Some Restrictions?
- **Oracle Provider:** Quality control for answers (can be DAO-governed later)
- **Emergency Pause:** Security circuit breaker if critical bug found
- **Fee Withdrawal:** Prevents random addresses from draining protocol fees

## 🚀 Deploy Your Own

```bash
# Clone the SDK
git clone https://github.com/yourusername/sora-oracle

# Install dependencies
npm install

# Configure your deployment
cp .env.example .env
# Add your PRIVATE_KEY

# Deploy to testnet
npm run deploy:sora

# Your own permissionless oracle is live!
```

## 📜 License

**MIT License** - Use it, fork it, modify it, sell it - whatever you want!

## 🤝 Contributing

This is an open-source project. Contributions welcome:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit PRs
- 📖 Improve docs

## 🔗 Resources

- **GitHub:** [Your Repo URL]
- **Documentation:** See README.md, TWAP_GUIDE.md
- **Examples:** See `contracts/SimplePredictionMarket.sol`
- **Community:** [Discord/Telegram]

---

**Built by the community, for the community** 🌐

No gatekeepers. No permissions. Just code.
