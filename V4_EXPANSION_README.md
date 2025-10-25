# Sora Oracle V4 Expansion

**10 new smart contracts expanding oracle capabilities with advanced features.**

## Overview

V4 Expansion adds three major categories of functionality:
1. **Oracle Enhancements** (3 contracts) - Multi-provider consensus, scheduled feeds, cross-chain data
2. **Market Innovations** (4 contracts) - New market types for complex predictions
3. **Governance & Staking** (3 contracts) - Decentralized control and provider reputation

---

## 🔮 Oracle Enhancements

### 1. AggregatedOracle

**Purpose:** Combine multiple oracle providers for consensus-based answers

**Key Features:**
- Weighted voting system (providers have different weights based on reputation)
- Minimum provider requirement (default: 3 providers)
- Automatic aggregation using weighted averages
- Provider performance tracking

**Use Cases:**
- High-stakes markets requiring multiple data sources
- Price feeds that need manipulation resistance
- Critical decisions requiring consensus

**Example:**
```javascript
// Add oracle providers
await aggregatedOracle.addProvider(provider1Address, 5000); // 50% weight
await aggregatedOracle.addProvider(provider2Address, 3000); // 30% weight
await aggregatedOracle.addProvider(provider3Address, 2000); // 20% weight

// Providers submit answers
await aggregatedOracle.submitAnswer(questionId, 42000, 95); // confidence: 95%

// Aggregate after minimum submissions
await aggregatedOracle.aggregateAnswer(questionId);

// Get final answer
const answer = await aggregatedOracle.getAnswer(questionId);
```

---

### 2. ScheduledOracle

**Purpose:** Automatic, recurring data feeds for prices, weather, sports, etc.

**Key Features:**
- Custom update intervals (minimum 1 minute)
- Price feeds with TWAP integration
- Custom data feeds (weather, sports, etc.)
- Historical data storage (last 100 values)
- Automated keeper support

**Use Cases:**
- Real-time price tracking
- Weather prediction markets
- Sports betting with live updates
- Any recurring data needs

**Example:**
```javascript
// Create price feed
await scheduledOracle.createPriceFeed(
  feedId,
  3600, // Update every hour
  pancakePairAddress,
  true, // Use TWAP
  { value: ethers.parseEther("0.001") }
);

// Auto-update (can be called by keepers)
await scheduledOracle.autoUpdatePriceFeed(feedId);

// Get current value
const { value, confidence, needsUpdate } = await scheduledOracle.getCurrentValue(feedId);

// Get historical data
const history = await scheduledOracle.getFeedHistory(feedId);
```

---

### 3. CrossChainBridge

**Purpose:** Bridge oracle data between BNB Chain and other networks

**Key Features:**
- Support for Ethereum, Polygon, Arbitrum, Optimism, Base
- Relayer verification system (requires multiple confirmations)
- Message status tracking
- Cross-chain oracle synchronization

**Use Cases:**
- Multi-chain prediction markets
- Cross-chain price feeds
- Synchronized oracle data across networks

**Example:**
```javascript
// Configure target chain
await crossChainBridge.configureChain(
  1, // Ethereum mainnet
  ChainType.ETHEREUM,
  bridgeContractAddress,
  12 // Confirmation blocks
);

// Send oracle data to Ethereum
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ['uint256', 'uint64', 'uint8'],
  [questionId, answer, confidence]
);

await crossChainBridge.sendCrossChainMessage(
  1, // Target: Ethereum
  payload,
  { value: ethers.parseEther("0.005") } // Relay fee
);

// Relayers verify
await crossChainBridge.verifyMessage(messageHash);

// Execute on target chain
await crossChainBridge.executeMessage(messageHash);
```

---

## 📊 Market Innovations

### 4. ConditionalMarket

**Purpose:** Prediction markets that depend on outcomes of other markets

**Key Features:**
- Parent-child market relationships
- Automatic condition checking
- Refunds if parent condition not met
- Standard parimutuel payouts

**Use Cases:**
- "Will BTC hit $100k IF Fed cuts rates?"
- "Will ETH 2x IF Bitcoin ETF approved?"
- Complex multi-stage predictions

**Example:**
```javascript
// Create conditional market
const marketId = await conditionalMarket.createMarket(
  "Will BTC hit $100k IF Fed cuts rates?",
  parentMarketAddress, // Fed rate decision market
  1 // Required outcome: Yes (rates cut)
);

// Take position
await conditionalMarket.takePosition(marketId, true, { value: ethers.parseEther("1.0") });

// Check parent market (done automatically or manually)
await conditionalMarket.checkParentMarket(marketId);

// If parent condition met, resolve this market
await conditionalMarket.resolveMarket(marketId, true);

// Claim winnings
await conditionalMarket.claimWinnings(marketId);
```

---

### 5. AMMMarket

**Purpose:** Automated Market Maker for continuous trading (like Polymarket)

**Key Features:**
- Constant product formula (x * y = k)
- Continuous liquidity provision
- Dynamic pricing based on trades
- Liquidity provider rewards

**Use Cases:**
- High-liquidity prediction markets
- Continuous trading without waiting for resolution
- Market-making opportunities

**Example:**
```javascript
// Create AMM market
const marketId = await ammMarket.createMarket(
  "Will BTC hit $100k in 2025?",
  ethers.parseEther("100"), // Initial YES tokens
  ethers.parseEther("100"), // Initial NO tokens
  { value: ethers.parseEther("200") }
);

// Buy YES tokens
await ammMarket.buyTokens(marketId, true, { value: ethers.parseEther("10") });

// Check current price
const price = await ammMarket.getCurrentPrice(marketId); // Returns 0-10000 (basis points)

// Add liquidity
await ammMarket.addLiquidity(
  marketId,
  ethers.parseEther("50"),
  ethers.parseEther("50"),
  { value: ethers.parseEther("100") }
);

// Resolve and claim
await ammMarket.resolveMarket(marketId, true);
await ammMarket.claimWinnings(marketId);
```

---

### 6. RangeMarket

**Purpose:** Bet on whether a value falls within a specific range

**Key Features:**
- Upper and lower bound configuration
- Oracle integration for settlement
- Parimutuel pools (IN_RANGE vs OUT_OF_RANGE)
- Real-time odds calculation

**Use Cases:**
- "Will BTC be between $30k-$35k on Dec 31?"
- Temperature range predictions
- Price range betting

**Example:**
```javascript
// Create range market
const marketId = await rangeMarket.createMarket(
  "BTC price on Dec 31, 2025",
  30000, // Lower bound
  35000, // Upper bound
  deadline,
  { value: ethers.parseEther("0.01") } // Oracle fee
);

// Bet IN RANGE
await rangeMarket.takePosition(marketId, true, { value: ethers.parseEther("1.0") });

// Get current odds
const { inRangeOdds, outRangeOdds } = await rangeMarket.getOdds(marketId);

// Resolve using oracle answer
await rangeMarket.resolveMarket(marketId);

// Claim if won
await rangeMarket.claimWinnings(marketId);
```

---

### 7. TimeSeriesMarket

**Purpose:** Predictions over multiple time periods

**Key Features:**
- 2-12 time periods supported
- ALL-or-NOTHING outcome (all periods must succeed)
- Individual period tracking
- Historical performance analysis

**Use Cases:**
- "Will BTC increase every month in Q1 2025?" (3 periods)
- Quarterly performance predictions
- Sequential event predictions

**Example:**
```javascript
// Create time series market (3 months)
const deadlines = [
  timestamp + 30 * 86400,  // Month 1
  timestamp + 60 * 86400,  // Month 2
  timestamp + 90 * 86400   // Month 3
];

const marketId = await timeSeriesMarket.createMarket(
  "Will BTC increase each month in Q1?",
  deadlines,
  { value: ethers.parseEther("0.03") } // 0.01 per period
);

// Bet on ALL SUCCESS
await timeSeriesMarket.takePosition(marketId, true, { value: ethers.parseEther("1.0") });

// Resolve each period
await timeSeriesMarket.resolvePeriod(marketId, 0); // Month 1
await timeSeriesMarket.resolvePeriod(marketId, 1); // Month 2
await timeSeriesMarket.resolvePeriod(marketId, 2); // Month 3

// Get period details
const period = await timeSeriesMarket.getPeriod(marketId, 0);

// Claim after all periods resolved
await timeSeriesMarket.claimWinnings(marketId);
```

---

## 🏛️ Governance & Staking

### 8. OracleStaking

**Purpose:** Oracle providers stake BNB to build reputation and earn rewards

**Key Features:**
- Minimum stake requirement (0.1 BNB)
- Reward distribution based on stake
- Reputation scoring (0-1000)
- 7-day unstake lock period
- Performance tracking

**Use Cases:**
- Oracle provider reputation system
- Reward distribution for accurate answers
- Quality assurance through economic stake

**Example:**
```javascript
// Stake as oracle provider
await oracleStaking.stake({ value: ethers.parseEther("5.0") });

// Record answers (called by oracle system)
await oracleStaking.recordAnswer(providerAddress, true); // Accurate
await oracleStaking.recordAnswer(providerAddress, false); // Inaccurate

// Check reputation
const { reputationScore, totalAnswers, accurateAnswers } = await oracleStaking.getStaker(providerAddress);

// Claim rewards
await oracleStaking.claimRewards();

// Get stake weight (for aggregated oracle)
const weight = await oracleStaking.getStakeWeight(providerAddress);

// Unstake (after lock period)
await oracleStaking.unstake(ethers.parseEther("2.0"));
```

---

### 9. DAOGovernance

**Purpose:** Decentralized governance for system parameters

**Key Features:**
- Token-weighted voting
- Proposal types: Fee changes, parameters, oracle management
- Quorum requirements (minimum votes for validity)
- 3-day voting period
- 60% pass threshold

**Use Cases:**
- Community control over fees
- Oracle provider management
- System parameter updates
- Platform evolution decisions

**Example:**
```javascript
// Create proposal
const proposalId = await daoGovernance.createProposal(
  ProposalType.FEE_CHANGE,
  "Reduce oracle fee to 0.005 BNB",
  "Lower barrier to entry for oracle usage",
  executionData
);

// Cast vote
await daoGovernance.castVote(proposalId, true); // Vote YES

// Finalize after voting period
await daoGovernance.finalizeProposal(proposalId);

// Execute if passed
await daoGovernance.executeProposal(proposalId);

// Get active proposals
const activeProposals = await daoGovernance.getActiveProposals();
```

---

### 10. SlashingMechanism

**Purpose:** Penalize dishonest oracle providers

**Key Features:**
- Violation types: Wrong answer, delayed answer, manipulation, collusion
- Community voting on disputes
- Graduated slashing (5%-50% based on severity)
- Slashing history tracking
- 3-day dispute period

**Use Cases:**
- Quality assurance
- Punishment for malicious behavior
- Dispute resolution
- Provider accountability

**Example:**
```javascript
// Raise dispute
const disputeId = await slashingMechanism.raiseDispute(
  providerAddress,
  ViolationType.WRONG_ANSWER,
  questionId,
  "Provider gave incorrect answer with high confidence",
  { value: ethers.parseEther("0.01") } // Dispute fee
);

// Vote on dispute (requires 1 BNB stake)
await slashingMechanism.voteOnDispute(disputeId, true); // Vote guilty

// After 3 votes, slash is executed automatically

// Check slashing history
const history = await slashingMechanism.getSlashingHistory(providerAddress);
const totalSlashed = await slashingMechanism.totalSlashed(providerAddress);
```

---

## Deployment

Deploy all 10 contracts:

```bash
# Testnet
npx hardhat run scripts/deploy-v4-expansion.js --network bscTestnet

# Mainnet
npx hardhat run scripts/deploy-v4-expansion.js --network bscMainnet
```

---

## Gas Costs

Estimated deployment costs (BSC Mainnet, 3 gwei):

| Contract | Gas Used | Cost (BNB) |
|----------|----------|------------|
| AggregatedOracle | ~2.5M | ~0.0075 |
| ScheduledOracle | ~2.8M | ~0.0084 |
| CrossChainBridge | ~2.6M | ~0.0078 |
| ConditionalMarket | ~2.4M | ~0.0072 |
| AMMMarket | ~2.7M | ~0.0081 |
| RangeMarket | ~2.3M | ~0.0069 |
| TimeSeriesMarket | ~2.5M | ~0.0075 |
| OracleStaking | ~2.9M | ~0.0087 |
| DAOGovernance | ~2.8M | ~0.0084 |
| SlashingMechanism | ~2.6M | ~0.0078 |
| **TOTAL** | **~26M** | **~0.078 BNB** |

---

## Integration with V3

All V4 contracts integrate seamlessly with existing V3 infrastructure:

- **RangeMarket & TimeSeriesMarket** use SoraOracle for resolution
- **SlashingMechanism** integrates with OracleStaking
- **AggregatedOracle** can use existing oracle providers
- **CrossChainBridge** extends oracle data to other chains

---

## Security Considerations

1. **OracleStaking**: 7-day lock prevents flash attacks
2. **DAOGovernance**: Quorum + pass threshold prevents manipulation
3. **SlashingMechanism**: Multi-vote requirement prevents false accusations
4. **AMMMarket**: Standard AMM security (reentrancy guards, etc.)
5. **ConditionalMarket**: Parent market verification required

---

## Testing

Run full test suite:

```bash
npx hardhat test
```

Run specific category:

```bash
# Oracle enhancements
npx hardhat test test/AggregatedOracle.test.js
npx hardhat test test/ScheduledOracle.test.js

# Market innovations
npx hardhat test test/AMMMarket.test.js
npx hardhat test test/RangeMarket.test.js

# Governance
npx hardhat test test/OracleStaking.test.js
npx hardhat test test/DAOGovernance.test.js
```

---

## License

MIT
