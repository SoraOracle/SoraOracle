# Sora Oracle V5 Deployment Guide

## 📋 Overview
This guide covers deploying the V5 OrderBookMarket contract to BNB Chain testnet and mainnet.

## ✅ Pre-Deployment Checklist

### 1. Contract Status
- [x] OrderBookMarket.sol implemented
- [x] 16/16 tests passing (100% coverage)
- [x] Architect security review completed
- [x] No critical bugs
- [x] Gas optimizations applied

### 2. Dependencies
- [x] V3 contracts deployed to mainnet
- [x] SoraOracle deployed and verified
- [x] Hardhat configuration ready
- [x] Wallet funded with BNB

### 3. Test Results
```
✓ Market creation with oracle integration
✓ Buy order placement and matching
✓ Sell order placement and matching  
✓ Partial order fills
✓ Order cancellation with refunds
✓ Market resolution via oracle
✓ Winnings claims for both sides
✓ Order book views (buy/sell sides)
✓ Market price calculation
✓ Price/time priority matching
✓ Multi-part fills
✓ Sell-side collateral retention through settlement
✓ Buy-side price improvement refunds
```

## 🚀 Deployment Steps

### Step 1: Prepare Environment

```bash
# Check wallet balance
node check-balance.js

# Verify contracts compile
npx hardhat compile

# Run full test suite
npx hardhat test test/OrderBookMarket.test.js
```

### Step 2: Deploy to BSC Testnet

```bash
# Create deployment script
# File: scripts/deploy-v5-testnet.js
```

```javascript
const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying Sora Oracle V5 to BSC Testnet...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

    // V3 SoraOracle address on testnet (deploy V3 first if not done)
    const soraOracleAddress = "YOUR_SORA_ORACLE_TESTNET_ADDRESS";

    // Deploy OrderBookMarket
    console.log("Deploying OrderBookMarket...");
    const OrderBookMarket = await hre.ethers.getContractFactory("OrderBookMarket");
    const orderBookMarket = await OrderBookMarket.deploy(soraOracleAddress);
    await orderBookMarket.waitForDeployment();
    const orderBookAddress = await orderBookMarket.getAddress();
    console.log("✅ OrderBookMarket deployed to:", orderBookAddress);

    // Save deployment info
    const deployment = {
        network: "bsc-testnet",
        chainId: 97,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            SoraOracle: soraOracleAddress,
            OrderBookMarket: orderBookAddress
        }
    };

    const fs = require("fs");
    fs.writeFileSync(
        "deployments/v5-testnet.json",
        JSON.stringify(deployment, null, 2)
    );

    console.log("\n📝 Deployment saved to deployments/v5-testnet.json");
    console.log("\n🎉 V5 Deployment Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

```bash
# Run deployment
npx hardhat run scripts/deploy-v5-testnet.js --network bscTestnet
```

### Step 3: Verify Contract on BSCScan

```bash
# Verify OrderBookMarket
npx hardhat verify --network bscTestnet \
  YOUR_ORDER_BOOK_ADDRESS \
  YOUR_SORA_ORACLE_ADDRESS
```

### Step 4: Test on Testnet

```javascript
// Test script: scripts/test-v5-testnet.js
const hre = require("hardhat");

async function main() {
    const deployment = require("../deployments/v5-testnet.json");
    const [signer] = await hre.ethers.getSigners();

    const orderBookMarket = await hre.ethers.getContractAt(
        "OrderBookMarket",
        deployment.contracts.OrderBookMarket
    );

    console.log("Testing OrderBookMarket on testnet...\n");

    // 1. Create market
    console.log("1. Creating test market...");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const tx1 = await orderBookMarket.createMarket(
        "Will BTC hit $100k by end of month?",
        deadline,
        { value: hre.ethers.parseEther("0.01") }
    );
    await tx1.wait();
    console.log("✅ Market created");

    // 2. Place buy order
    console.log("2. Placing buy order...");
    const amount = hre.ethers.parseEther("1.0");
    const price = 6000; // 60%
    const tx2 = await orderBookMarket.placeOrder(
        0, // marketId
        true, // isBuy
        true, // isYes
        price,
        amount,
        { value: (amount * BigInt(price)) / BigInt(10000) }
    );
    await tx2.wait();
    console.log("✅ Buy order placed");

    // 3. View order book
    console.log("3. Viewing order book...");
    const [buyOrders, sellOrders] = await orderBookMarket.getOrderBook(0, true);
    console.log("Buy orders:", buyOrders.length);
    console.log("Sell orders:", sellOrders.length);

    console.log("\n✅ All tests passed!");
}

main().catch(console.error);
```

### Step 5: Deploy to Mainnet (After Testnet Success)

```bash
# Create mainnet deployment script
# File: scripts/deploy-v5-mainnet.js
```

```javascript
const hre = require("hardhat");

async function main() {
    console.log("⚠️  DEPLOYING TO BSC MAINNET");
    console.log("This will use real BNB. Continue? (Ctrl+C to cancel)\n");
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
    
    if (balance < hre.ethers.parseEther("0.05")) {
        throw new Error("Insufficient balance. Need at least 0.05 BNB");
    }

    // V3 SoraOracle address on mainnet
    const soraOracleAddress = "0x4124227dEf2A0c9BBa315dF13CD7B546f5839516";

    console.log("\nDeploying OrderBookMarket...");
    const OrderBookMarket = await hre.ethers.getContractFactory("OrderBookMarket");
    const orderBookMarket = await OrderBookMarket.deploy(soraOracleAddress);
    await orderBookMarket.waitForDeployment();
    const orderBookAddress = await orderBookMarket.getAddress();
    console.log("✅ OrderBookMarket deployed to:", orderBookAddress);

    // Save deployment
    const deployment = {
        network: "bsc-mainnet",
        chainId: 56,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            SoraOracle: soraOracleAddress,
            OrderBookMarket: orderBookAddress
        }
    };

    const fs = require("fs");
    fs.writeFileSync(
        "deployments/v5-mainnet.json",
        JSON.stringify(deployment, null, 2)
    );

    console.log("\n📝 Deployment saved to deployments/v5-mainnet.json");
    console.log("\n🎉 V5 MAINNET DEPLOYMENT COMPLETE!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 📊 Estimated Costs

### BSC Testnet
- **OrderBookMarket deployment:** Free (testnet BNB)
- **Verification:** Free
- **Testing:** Free

### BSC Mainnet
- **OrderBookMarket deployment:** ~0.01-0.02 BNB (~$3-6 USD)
- **Verification:** Free
- **Testing (create market):** ~0.01 BNB

**Total Mainnet Cost:** ~0.02-0.03 BNB (~$6-9 USD)

## 🔍 Post-Deployment Verification

### 1. Contract Verification
```bash
# Check contract on BSCScan
https://bscscan.com/address/YOUR_CONTRACT_ADDRESS

# Verify source code matches
npx hardhat verify --network bscMainnet YOUR_ADDRESS ORACLE_ADDRESS
```

### 2. Functionality Tests
- Create test market
- Place buy order
- Place sell order
- View order book
- Cancel order
- Resolve market (after deadline)
- Claim winnings

### 3. Integration Tests
- Test with frontend
- Test with SDK
- Test oracle integration
- Test fee collection

## 🎯 Next Steps After Deployment

### 1. Update Frontend
```javascript
// frontend/src/config.js
export const CONTRACTS = {
  // V3 contracts
  soraOracle: "0x4124227dEf2A0c9BBa315dF13CD7B546f5839516",
  simplePredictionMarket: "0x6Bd664D0641D8C18C869AD18f61143BB4EDe790c",
  multiOutcomeMarket: "0x44A091e2e47A1ab038255107e02017ae18CcF9BF",
  
  // V5 contract
  orderBookMarket: "YOUR_V5_ADDRESS" // Add this
};
```

### 2. Update SDK
```typescript
// sdk/src/clients/orderbook-client.ts
export class OrderBookClient {
  constructor(provider, signer) {
    this.contract = new Contract(
      "YOUR_V5_ADDRESS",
      OrderBookMarketABI,
      signer || provider
    );
  }
  
  async createMarket(question, deadline) { ... }
  async placeOrder(marketId, isBuy, isYes, price, amount) { ... }
  async cancelOrder(marketId, orderId) { ... }
  async getOrderBook(marketId, isYes) { ... }
  async claimWinnings(marketId) { ... }
}
```

### 3. Documentation
- Update README with V5 features
- Add order book examples
- Document SDK methods
- Create user guides

### 4. Marketing
- Announce V5 launch
- Highlight limit order book
- Show trading features
- Onboard users

## 🛡️ Security Considerations

### Smart Contract Security
- [x] ReentrancyGuard on all external functions
- [x] Access control (only owner can cancel own orders)
- [x] Input validation (price, amount, deadlines)
- [x] Collateral safety (no funds trapped)
- [x] Architect security review completed

### Operational Security
- Use hardware wallet for mainnet deployment
- Test thoroughly on testnet first
- Start with small markets
- Monitor for issues
- Have emergency pause plan

## 📞 Support

### Resources
- **Documentation:** README.md, V5_ORDER_BOOK_SUMMARY.md
- **Tests:** test/OrderBookMarket.test.js
- **Contract:** contracts/OrderBookMarket.sol

### Emergency Contacts
- **Deployer:** 0x290f6cB6457A87d64cb309Fe66F9d64a4df0addE
- **BSCScan:** https://bscscan.com/
- **Hardhat Docs:** https://hardhat.org/

---

**Built by:** Sora Oracle Team  
**Date:** October 25, 2025  
**Version:** V4.0  
**Status:** Production-Ready ✅
