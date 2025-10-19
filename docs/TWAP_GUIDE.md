# TWAP Price Oracle Guide

## 🎯 Overview

The Sora Oracle includes **two types of price feeds** for different use cases:

| Type | Use Case | Update Frequency | Manipulation Risk |
|------|----------|-----------------|-------------------|
| **TWAP** | Market settlements, predictions | Every 5 minutes | ✅ Low - Averaged over time |
| **Spot** | Display only, UI updates | Real-time | ⚠️ High - Can be manipulated |

## 📊 Two Price Functions

### 1. TWAP Price (For Settlements)

**Use this for:** Resolving prediction markets, oracle answers, any financial settlements

```solidity
// Get manipulation-resistant price
uint256 twapPrice = twapOracle.consult(tokenAddress, amount);
```

**How it works:**
- Averages price over 5-minute windows
- Resistant to flash loans and wash trading
- Updates every 5 minutes minimum
- Uses time-weighted calculation

**Example:**
```javascript
// Get TWAP price for 1 WBNB in BUSD
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const amount = ethers.parseEther("1");

const twapPrice = await twapOracle.consult(WBNB, amount);
console.log(`1 WBNB = ${ethers.formatEther(twapPrice)} BUSD (TWAP)`);
```

### 2. Spot Price (For Display Only)

**Use this for:** UI displays, charts, informational purposes

```solidity
// Get instant spot price (can be manipulated!)
uint256 spotPrice = twapOracle.getCurrentPrice(tokenAddress, amount);
```

**How it works:**
- Reads current pool reserves
- Updates instantly with every swap
- Can be manipulated with large trades
- **DO NOT USE FOR SETTLEMENTS**

**Example:**
```javascript
// Get current spot price for display
const spotPrice = await twapOracle.getCurrentPrice(WBNB, amount);
console.log(`Current price: ${ethers.formatEther(spotPrice)} BUSD`);
```

## 🤖 Automatic Price Updates

### Setup Auto-Updater

1. **Add oracle address to .env:**
```env
SORA_ORACLE_ADDRESS=0xYourOracleAddressHere
```

2. **Start auto-updater:**
```bash
npm run sora:auto-update
```

The updater will:
- ✅ Update TWAP every 5 minutes
- ✅ Monitor all configured pairs (WBNB/BUSD, WBNB/USDT, CAKE/WBNB)
- ✅ Display current prices
- ✅ Track gas usage
- ✅ Show update statistics

### Output Example

```
🤖 TWAP Auto-Updater Starting
======================================================================
⏰ Update Interval: 5 minutes
📍 Oracle Address: 0xABCD...EF01
🌐 Network: bscTestnet
======================================================================

👤 Updater Account: 0x1234...5678
💰 Account Balance: 0.5 BNB

⏰ [1/19/2025, 3:00:00 PM] Running scheduled update...
----------------------------------------------------------------------
📊 [WBNB_BUSD] Current spot price: 650.5 per 1 WBNB
🔄 [WBNB_BUSD] Updating TWAP oracle...
✅ [WBNB_BUSD] TWAP updated! Block: 65142811, Gas: 45123
----------------------------------------------------------------------
📊 Stats: 1 updates, 0 errors
⏰ Next update in 5 minutes...
```

### Manual Price Check

View current prices anytime:

```bash
npm run sora:prices
```

Output:
```
📊 WBNB_BUSD Price Feed
======================================================================

💹 SPOT PRICE (Display Only - Can be manipulated):
   1 Token0 = 650.5 Token1
   1 Token1 = 0.00153846 Token0

⏱️  TWAP PRICE (For Settlements - Manipulation-resistant):
   1 Token0 = 649.8 Token1
   1 Token1 = 0.00153911 Token0

📈 TWAP Window:
   Period: 5 minutes
   Last Update: 1/19/2025, 3:00:00 PM
   Can Update: ⏳ Not yet (wait 5 min)

======================================================================
```

## 🔧 Integration Examples

### Example 1: Prediction Market

```solidity
contract PredictionMarket {
    PancakeTWAPOracle public priceOracle;
    
    // Use SPOT price for display
    function getCurrentPrice() external view returns (uint256) {
        return priceOracle.getCurrentPrice(WBNB, 1 ether);
    }
    
    // Use TWAP price for settlement
    function resolveMarket() external {
        uint256 settlementPrice = priceOracle.consult(WBNB, 1 ether);
        
        // Resolve market based on TWAP (manipulation-resistant)
        if (settlementPrice > targetPrice) {
            outcome = Outcome.YES;
        } else {
            outcome = Outcome.NO;
        }
    }
}
```

### Example 2: Price Display UI

```javascript
// Update UI every second with spot price
setInterval(async () => {
  const spotPrice = await twapOracle.getCurrentPrice(WBNB, parseEther("1"));
  updatePriceDisplay(formatEther(spotPrice));
}, 1000);

// Show TWAP for "settlement price"
const twapPrice = await twapOracle.consult(WBNB, parseEther("1"));
showSettlementPrice(formatEther(twapPrice));
```

## 📋 Configuration

### Supported Pairs (BSC Mainnet)

| Pair | Address |
|------|---------|
| WBNB/BUSD | `0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16` |
| WBNB/USDT | `0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE` |
| CAKE/WBNB | `0x0eD7e52944161450477ee417DE9Cd3a859b14fD0` |

### Add Custom Pair

1. Deploy oracle:
```javascript
await soraOracle.addTWAPOracle(customPairAddress);
```

2. Add to auto-updater in `scripts/auto-update-twap.js`:
```javascript
const PAIRS = {
  WBNB_BUSD: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
  YOUR_PAIR: "0xYourPairAddress"
};
```

## ⚙️ Technical Details

### TWAP Calculation

```
TWAP = (priceCumulativeEnd - priceCumulativeStart) / timeElapsed
```

- **Price Cumulative:** Sum of (price × time) over all blocks
- **Time Elapsed:** Must be ≥ 5 minutes
- **Encoding:** UQ112x112 fixed-point format

### Gas Costs

| Operation | Gas | BNB Cost* |
|-----------|-----|-----------|
| Update TWAP | ~45,000 | ~$0.09 |
| Read Spot Price | ~3,000 | Free (view) |
| Read TWAP | ~5,000 | Free (view) |

*Based on 5 gwei gas, $600 BNB

### Security

**TWAP is manipulation-resistant because:**
- ✅ 5-minute averaging makes flash loans ineffective
- ✅ Would need to hold manipulated price for 5+ minutes (very expensive)
- ✅ Cumulative price calculation across many blocks
- ✅ Follows Uniswap V2 proven pattern

**Spot price CAN be manipulated:**
- ⚠️ Large trades can temporarily shift price
- ⚠️ Flash loans can manipulate within single transaction
- ⚠️ Never use for financial settlements

## 🚀 Best Practices

1. ✅ **Always use TWAP for settlements**
2. ✅ **Use spot price only for display**
3. ✅ **Run auto-updater on server/cron**
4. ✅ **Monitor updater balance**
5. ✅ **Test on testnet first**
6. ⚠️ **Never trust spot price for money**
7. ⚠️ **Keep updater wallet funded**

## 🔍 Troubleshooting

### "Period not elapsed" Error

**Problem:** Trying to update TWAP before 5 minutes

**Solution:** Wait for 5-minute window or check `canUpdate()`:
```javascript
const canUpdate = await twapOracle.canUpdate();
if (canUpdate) {
  await twapOracle.update();
}
```

### "Insufficient data" Error

**Problem:** TWAP not initialized (needs first update)

**Solution:** Call `update()` once to initialize:
```bash
npm run sora:auto-update
```

### Auto-Updater Not Running

**Problem:** SORA_ORACLE_ADDRESS not set

**Solution:** Add to `.env`:
```env
SORA_ORACLE_ADDRESS=0xYourOracleAddress
```

---

**Built for BNB Chain Prediction Markets** 🚀
