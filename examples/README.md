# Sora Oracle SDK - Examples

This directory contains practical examples showing how to integrate Sora Oracle into your applications.

## 📁 Directory Structure

### `prediction-markets/`
Complete prediction market implementations:

- **`basic-market.sol`** - Simple YES/NO prediction market
  - Perfect starting point for binary predictions
  - Oracle-resolved outcomes
  - Proportional winnings distribution

- **`price-prediction-market.sol`** - Price target markets
  - "Will CAKE reach $5 by Dec 31st?"
  - Uses TWAP for manipulation-resistant settlements
  - Works with ANY PancakeSwap pair (permissionless!)

### `integrations/`
Real-world DeFi integrations:

- **`integrate-any-token.js`** - Query any token pair
  - Shows permissionless TWAP oracle usage
  - Bootstrap mode handling
  - Auto-creation pattern

- **`defi-lending.sol`** - Lending protocol example
  - Accept ANY token as collateral
  - TWAP-based liquidations
  - Manipulation-resistant pricing

### `utilities/`
Helpful tools and bots:

- **`price-alerts.js`** - Price monitoring bot
  - Monitor any token 24/7
  - Trigger alerts on price targets
  - Perfect for trading strategies

## 🚀 Quick Start

### 1. Deploy Oracle
```bash
npm run deploy:sora
```

### 2. Run an Example

**Price Alerts:**
```bash
# Set your oracle address
export SORA_ORACLE_ADDRESS=0xYourOracleAddress

# Run the bot
node examples/utilities/price-alerts.js
```

**Integration Test:**
```bash
node examples/integrations/integrate-any-token.js
```

### 3. Deploy Your Market

```bash
# Compile contracts
npx hardhat compile

# Deploy your prediction market
npx hardhat run scripts/deploy-your-market.js --network bscTestnet
```

## 📖 Example Workflows

### Build a Prediction Market

1. **Start with basic-market.sol**
   - Understand the core pattern
   - See how oracle integration works

2. **Customize for your use case**
   - Add features: fees, time limits, multi-outcome
   - Integrate with your frontend

3. **Deploy and test**
   - Use BSC testnet first
   - Monitor gas costs and UX

### Build a DeFi Protocol

1. **Study defi-lending.sol**
   - Learn bootstrap mode handling
   - Understand TWAP safety checks

2. **Adapt to your protocol**
   - Collateral ratios
   - Liquidation logic
   - Risk parameters

3. **Add your tokens**
   - Works with ANY PancakeSwap pair
   - No approval needed!

### Build a Trading Bot

1. **Use price-alerts.js as template**
   - Monitor multiple pairs
   - Add your trading logic
   - Integrate with DEX

2. **Add automation**
   - Auto-buy on dips
   - Take profit on targets
   - Risk management

## 🔑 Key Concepts

### Permissionless Integration

```javascript
// Works with ANY token - no whitelist!
const price = await oracle.getTWAPPrice(anyPair, anyToken, amount);
```

### Bootstrap Safety

```javascript
// Always check before financial operations
const twap = await oracle.twapOracles(pair);
if (await twap.canConsult()) {
    // TWAP ready - safe for settlements ✅
} else {
    // Bootstrap mode - display only ⚠️
}
```

### Auto-Creation Pattern

```solidity
// Oracle auto-creates on first query
function usePriceOracle(address pair, address token) external {
    // No setup needed - just query!
    uint256 price = oracle.getTWAPPrice(pair, token, 1e18);
}
```

## 💡 Ideas to Build

### Prediction Markets
- Sports outcomes
- Election predictions
- Crypto price targets
- NFT floor prices
- DeFi TVL predictions

### DeFi Protocols
- Lending/Borrowing
- Synthetic assets
- Options protocols
- Perpetual futures
- Yield optimizers

### Trading Tools
- Price alerts
- Arbitrage bots
- Portfolio trackers
- Risk monitors
- Auto-rebalancers

### Analytics
- Market sentiment
- Price feeds
- Volume trackers
- APY calculators
- Liquidity monitors

## 📚 Additional Resources

- **[SDK Guide](../docs/SDK_GUIDE.md)** - Complete integration guide
- **[Bootstrap Guide](../docs/BOOTSTRAP_GUIDE.md)** - TWAP bootstrap explained
- **[Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)** - How to deploy
- **[Main README](../README.md)** - Project overview

## 🤝 Contributing

Have a cool example? Submit a PR!

1. Add your example to appropriate directory
2. Include clear comments
3. Add usage instructions
4. Test on BSC testnet

## ⚠️ Important Notes

- **Bootstrap Period**: New pairs need 5 min for TWAP
- **Always check** `canConsult()` before settlements
- **Test thoroughly** on testnet first
- **Gas costs**: Factor in deployment and operation costs

## 🆘 Need Help?

- Check documentation in `/docs`
- Review test cases in `/test`
- Open an issue on GitHub
- Join our community

---

**Build permissionless DeFi!** 🌐

No gatekeepers. No approvals. Just code.
