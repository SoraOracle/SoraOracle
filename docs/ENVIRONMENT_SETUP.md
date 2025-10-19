# 🔧 Environment Setup Guide

Complete guide for configuring your environment for Sora Oracle deployment and operations.

---

## 📋 Prerequisites

### Required Software
- **Node.js** v18+ and npm
- **Git** for version control
- **A wallet** with private key for deployment
- **BSC RPC access** (public endpoints available)

### Required Accounts
- **BSC wallet** with BNB for deployment (testnet or mainnet)
- **BSCScan API key** (optional, for automatic contract verification)
- **Oracle provider wallet** (can be same as deployer)

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

### Complete .env Template

```bash
# ============================================
# DEPLOYMENT CONFIGURATION
# ============================================

# Private key for contract deployment (KEEP SECRET!)
# Get from MetaMask: Account Details → Export Private Key
PRIVATE_KEY=0xYourPrivateKeyHere

# Oracle provider address (receives fees, answers questions)
# Can be same as deployer address or a separate wallet
ORACLE_PROVIDER_ADDRESS=0xYourOracleProviderAddress

# ============================================
# DEPLOYED CONTRACT ADDRESSES
# ============================================

# After deployment, add your contract address here
# Testnet example: 0xA215e1bE0a679a6F74239A590dC6842558954e1a
SORA_ORACLE_ADDRESS=

# If you deploy the prediction market example
PREDICTION_MARKET_ADDRESS=

# ============================================
# BLOCKCHAIN CONFIGURATION
# ============================================

# Network selection (uncomment one)
NETWORK=bscTestnet
# NETWORK=bscMainnet

# Custom RPC endpoints (optional - defaults provided)
# BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
# BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/

# Gas price in Gwei (optional - auto-detect if not set)
# GAS_PRICE_GWEI=5

# ============================================
# API KEYS
# ============================================

# BSCScan API key for contract verification (optional)
# Get free key at: https://bscscan.com/myapikey
BSCSCAN_API_KEY=

# ============================================
# OPERATIONAL SETTINGS
# ============================================

# Auto-updater settings (for TWAP oracles)
UPDATE_INTERVAL_MINUTES=5
AUTO_UPDATE_ENABLED=true

# Monitoring settings
ENABLE_QUESTION_ALERTS=true
ENABLE_GAS_ALERTS=true
GAS_ALERT_THRESHOLD_GWEI=20

# Provider wallet settings
MIN_PROVIDER_BALANCE=0.1  # Minimum BNB balance before alert
```

### Security Best Practices

1. **Never commit .env to Git:**
   ```bash
   # Already in .gitignore, but double-check:
   echo ".env" >> .gitignore
   ```

2. **Use separate wallets for different roles:**
   - Deployer: High-security, used once
   - Provider: Medium-security, used frequently
   - Operations: Low-value, for monitoring

3. **Back up your private keys securely:**
   - Store in password manager
   - Keep offline backup
   - Never share or expose online

---

## 🌐 Network Configurations

### BSC Testnet (For Development)

```javascript
{
  name: "BSC Testnet",
  chainId: 97,
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
  explorerUrl: "https://testnet.bscscan.com",
  currency: {
    name: "Test BNB",
    symbol: "tBNB",
    decimals: 18
  }
}
```

**Get Test BNB:**
- https://testnet.binance.org/faucet-smart
- Requires 0.001 mainnet BNB to prove you're not a bot
- Gives 0.5 tBNB per request

**Testnet Features:**
- Free transactions (just need test BNB)
- Same functionality as mainnet
- Safe for testing and development
- Contract verification available

### BSC Mainnet (For Production)

```javascript
{
  name: "BSC Mainnet",
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org/",
  explorerUrl: "https://bscscan.com",
  currency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18
  }
}
```

**Mainnet Requirements:**
- Real BNB (~0.5 BNB recommended for deployment)
- Careful testing on testnet first
- Contract verification recommended
- Monitor gas prices (3-5 Gwei typical)

**Alternative RPC Endpoints** (if primary is slow):
- https://bsc-dataseed1.binance.org/
- https://bsc-dataseed2.binance.org/
- https://bsc-dataseed3.binance.org/
- https://bsc-dataseed4.binance.org/

---

## 📦 Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/sora-oracle.git
cd sora-oracle

# Install dependencies
npm install

# Verify installation
npx hardhat --version
```

### 2. Configure Environment

```bash
# Create .env from template
cp .env.example .env

# Edit .env with your values
nano .env
```

### 3. Verify Configuration

```bash
# For testnet
npx hardhat run scripts/check-mainnet-config.js --network bscTestnet

# For mainnet
npx hardhat run scripts/check-mainnet-config.js --network bscMainnet
```

### 4. Run Tests

```bash
# Run all tests
npx hardhat test

# Expected output: 43/43 tests passing
```

---

## 💰 Wallet Setup

### MetaMask Configuration

1. **Add BSC Testnet:**
   - Network Name: BSC Testnet
   - RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
   - Chain ID: 97
   - Symbol: tBNB
   - Block Explorer: https://testnet.bscscan.com

2. **Add BSC Mainnet:**
   - Network Name: BSC Mainnet
   - RPC URL: https://bsc-dataseed.binance.org/
   - Chain ID: 56
   - Symbol: BNB
   - Block Explorer: https://bscscan.com

3. **Export Private Key:**
   - Click account icon → Account Details
   - Click "Export Private Key"
   - Enter password
   - Copy entire key including 0x prefix

### Recommended Wallet Balances

**Testnet:**
- Deployer: 0.3 tBNB
- Provider: 0.1 tBNB (for operations)

**Mainnet:**
- Deployer: 0.5 BNB (~$300 at $600/BNB)
- Provider: 0.2 BNB (ongoing operations)
- Emergency fund: 0.3 BNB (reserve)

---

## 🔑 BSCScan API Key Setup

### Why You Need It
- Automatic contract verification
- Source code visibility on BSCScan
- Better user trust and transparency
- Easier integration for developers

### How to Get It

1. Visit https://bscscan.com/register
2. Create account (free)
3. Verify email
4. Go to https://bscscan.com/myapikey
5. Click "Add" to create new API key
6. Copy API key to .env file

**Note:** Same API key works for both testnet and mainnet!

---

## ⚙️ Gas Price Configuration

### Understanding Gas on BSC

- **Gas Limit:** Max computation (auto-calculated)
- **Gas Price:** Cost per unit (you set this)
- **Transaction Cost:** Gas Limit × Gas Price

**Typical BSC Gas Prices:**
- Low traffic: 3-5 Gwei
- Normal: 5-10 Gwei  
- High traffic: 10-20 Gwei
- Urgent: 20+ Gwei

### Setting Gas Price

**Option 1: Auto-detect (recommended)**
```javascript
// hardhat.config.js
networks: {
  bscMainnet: {
    url: process.env.BSC_MAINNET_RPC,
    accounts: [process.env.PRIVATE_KEY]
    // No gasPrice = auto-detect
  }
}
```

**Option 2: Fixed price**
```javascript
networks: {
  bscMainnet: {
    gasPrice: 5000000000  // 5 Gwei
  }
}
```

**Option 3: From environment**
```javascript
const GAS_PRICE = process.env.GAS_PRICE_GWEI 
  ? BigInt(process.env.GAS_PRICE_GWEI) * 1000000000n 
  : 5000000000n;

networks: {
  bscMainnet: {
    gasPrice: GAS_PRICE
  }
}
```

---

## ✅ Verification Checklist

Before deploying, verify:

- [ ] `.env` file created and configured
- [ ] Private key set (without 0x prefix)
- [ ] Oracle provider address set
- [ ] Network selected (testnet or mainnet)
- [ ] BSCScan API key set (optional but recommended)
- [ ] Wallet funded with sufficient BNB
- [ ] Dependencies installed (`npm install` successful)
- [ ] Tests passing (`npx hardhat test`)
- [ ] Configuration verified (`check-mainnet-config.js`)
- [ ] `.env` added to `.gitignore`

---

## 🐛 Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install dotenv
```

### "Invalid private key"
- Ensure private key includes `0x` prefix in .env
- Ensure no spaces or quotes around key
- Verify key is 66 characters total (0x + 64 hex chars)

### "Insufficient funds"
- Check wallet balance matches network (testnet vs mainnet)
- Get test BNB from faucet (testnet)
- Transfer BNB to wallet (mainnet)

### "Network not supported"
- Check `--network` flag matches hardhat.config.js
- Verify RPC endpoint is accessible
- Try alternative RPC endpoints

### "Transaction underpriced"
- Increase gas price in hardhat.config.js
- Wait for lower network congestion
- Use `gasPrice: 20000000000` (20 Gwei)

---

## 📚 Additional Resources

- **Hardhat Docs:** https://hardhat.org/getting-started/
- **BSC Docs:** https://docs.bnbchain.org/
- **OpenZeppelin:** https://docs.openzeppelin.com/
- **Ethers.js:** https://docs.ethers.org/v6/

---

**Next Steps:** After environment is configured, proceed to [MAINNET_DEPLOYMENT.md](./MAINNET_DEPLOYMENT.md)
