# TWAP Bootstrap Mode - Permissionless Price Feeds

## How Permissionless Oracles Work

When you query a new PancakeSwap pair for the first time, the oracle auto-creates but needs **5 minutes of data** before it can calculate a true TWAP. This guide explains the bootstrap period.

## Two Modes

### 🔴 Bootstrap Mode (0-5 minutes)
**What:** Returns instant spot price from reserves  
**When:** Immediately after oracle creation  
**Security:** ⚠️ Can be manipulated via flash loans  
**Use For:** Display, UI, informational purposes only

### 🟢 TWAP Mode (5+ minutes)
**What:** Returns time-weighted average price  
**When:** After first `update()` call (5+ min after creation)  
**Security:** ✅ Manipulation-resistant  
**Use For:** Financial settlements, prediction markets, liquidations

## Usage Pattern

```solidity
// Auto-creates oracle on first call
uint256 price = oracle.getTWAPPrice(pairAddress, token, amount);

// Check which mode we're in
PancakeTWAPOracle twap = oracle.twapOracles(pairAddress);
bool ready = twap.canConsult(); // false = bootstrap, true = TWAP

if (ready) {
    // Safe to use for settlements
    settlePredictionMarket(price);
} else {
    // Display only - wait for TWAP
    showPriceInUI(price);
}
```

## Integration Best Practices

### For Prediction Markets

```solidity
contract SafePredictionMarket {
    function createMarket(address pair, address token) external {
        // Get TWAP oracle (auto-creates if needed)
        uint256 price = oracle.getTWAPPrice(pair, token, 1e18);
        
        // Check if ready for settlements
        PancakeTWAPOracle twap = oracle.twapOracles(pair);
        require(twap.canConsult(), "Wait 5min for TWAP");
        
        // Now safe to create market with manipulation resistance
        _createMarket(price);
    }
}
```

### For Price Display

```javascript
// UI can show price immediately
const price = await oracle.getTWAPPrice(pair, token, amount);
const twap = await oracle.twapOracles(pair);
const isReady = await twap.canConsult();

if (isReady) {
    displayPrice(`$${price} (TWAP)`);
} else {
    displayPrice(`$${price} (Spot - Bootstrapping)`);
    showCountdown("TWAP ready in 5 min");
}
```

### For DeFi Protocols

```solidity
contract LendingProtocol {
    function liquidate(address collateral) external {
        PancakeTWAPOracle twap = oracle.twapOracles(collateralPair);
        
        // Only liquidate using manipulation-resistant TWAP
        require(twap.canConsult(), "TWAP not ready");
        
        uint256 price = oracle.getTWAPPrice(collateralPair, collateral, amount);
        if (price < liquidationThreshold) {
            _liquidate();
        }
    }
}
```

## Timeline Example

```
Time: 0:00 - First query
├─ Oracle auto-created
├─ Returns: Spot price (bootstrap mode)
└─ canConsult(): false

Time: 0:00 - 5:00 - Waiting
├─ Queries return: Spot price
├─ canConsult(): false
└─ ⚠️ Do not use for settlements!

Time: 5:00 - First update()
├─ Someone calls update()
├─ Observations saved
└─ canConsult(): true ✅

Time: 5:00+ - TWAP Ready
├─ Queries return: 5-min TWAP
├─ canConsult(): true
└─ ✅ Safe for settlements!
```

## Bootstrap API

```solidity
// Check if TWAP is ready
function canConsult() external view returns (bool)
// Returns: true if 5+ min elapsed, false if bootstrap mode

// Always works (auto-creates if needed)
function getTWAPPrice(address pair, address token, uint256 amount) 
    external returns (uint256)
// Returns: TWAP if ready, spot if bootstrap

// Get instant spot price
function getCurrentPrice(address token, uint256 amount) 
    external view returns (uint256)
// Returns: Instant price from reserves (can be manipulated!)
```

## FAQ

### Q: Why not just require TWAP from the start?
**A:** Would break permissionless UX - users would need to wait 5 min before using new pairs.

### Q: Is spot price safe for anything?
**A:** Yes! Safe for:
- UI display
- Charts and graphs
- Informational purposes
- Non-financial calculations

**NOT safe for:**
- Prediction market settlements
- Liquidations
- Collateral valuations
- Any financial decisions

### Q: How do I initialize a pair properly?
**A:** Two options:

```solidity
// Option 1: Pre-initialize (explicit)
oracle.addTWAPOracle(pairAddress);
// Wait 5 minutes...
twap.update();
// Now ready to use

// Option 2: Lazy + check (recommended)
uint256 price = oracle.getTWAPPrice(pair, token, amount);
PancakeTWAPOracle twap = oracle.twapOracles(pair);
if (twap.canConsult()) {
    // Ready! Use for settlements
} else {
    // Not ready yet, display only
}
```

### Q: Can attackers abuse bootstrap mode?
**A:** Only if you settle financial outcomes using bootstrap prices! 

**Solution:** Always check `canConsult()` before settlements:

```solidity
require(twap.canConsult(), "TWAP not ready");
```

### Q: Who calls update()?
**A:** Anyone! Common patterns:
1. Auto-updater script (runs every 5 min)
2. First user of the oracle
3. Market creators
4. Anyone incentivized to have fresh prices

## Best Practices

### ✅ DO
- Check `canConsult()` before financial settlements
- Use bootstrap prices for display/UI
- Show users when TWAP is ready
- Document bootstrap period to integrators
- Run auto-updater for popular pairs

### ❌ DON'T
- Settle prediction markets during bootstrap
- Use bootstrap prices for liquidations
- Assume TWAP is always ready
- Skip `canConsult()` checks in production
- Hide bootstrap status from users

## Code Examples

### Full Integration Example

```solidity
pragma solidity ^0.8.20;

import "./SoraOracle.sol";
import "./PancakeTWAPOracle.sol";

contract PermissionlessMarket {
    SoraOracle public oracle;
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    function createMarket(
        address pair,
        address token,
        uint256 targetPrice,
        bool allowBootstrap
    ) external {
        // Get price (auto-creates TWAP if needed)
        uint256 currentPrice = oracle.getTWAPPrice(pair, token, 1e18);
        
        // Check TWAP readiness
        PancakeTWAPOracle twap = oracle.twapOracles(pair);
        bool ready = twap.canConsult();
        
        if (!ready && !allowBootstrap) {
            revert("Wait for TWAP - market creation paused");
        }
        
        // Create market with appropriate risk label
        if (ready) {
            _createMarket(currentPrice, targetPrice, "TWAP-secured");
        } else {
            _createMarket(currentPrice, targetPrice, "Bootstrap-mode");
        }
    }
    
    function settle(uint256 marketId) external {
        Market memory market = markets[marketId];
        
        // ALWAYS require TWAP for settlements
        PancakeTWAPOracle twap = oracle.twapOracles(market.pair);
        require(twap.canConsult(), "Cannot settle: TWAP not ready");
        
        uint256 finalPrice = oracle.getTWAPPrice(
            market.pair,
            market.token,
            1e18
        );
        
        _settle(marketId, finalPrice);
    }
}
```

## Summary

- ✅ **Permissionless:** Any pair works immediately
- ⚡ **Instant access:** Bootstrap mode provides immediate prices
- 🔒 **Safe defaults:** Check `canConsult()` before settlements
- 🎯 **Best UX:** Display prices right away, settle after 5 min

**The SDK is permissionless AND secure** - you just need to check which mode you're in!
