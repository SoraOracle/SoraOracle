# 🚀 Quick Start Guide

Get started with Sora Oracle SDK in 5 minutes!

---

## Prerequisites

- Node.js v16+ installed
- BSC Testnet BNB (get free from [faucet](https://testnet.bnbchain.org/faucet-smart))
- MetaMask or similar wallet

---

## Step 1: Installation

```bash
git clone https://github.com/yourusername/sora-oracle.git
cd sora-oracle
npm install
```

---

## Step 2: Configuration

Create `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
ORACLE_PROVIDER_ADDRESS=your_wallet_address
```

**Important:** Never commit your `.env` file!

---

## Step 3: Deploy Oracle

```bash
npx hardhat run scripts/deploy-sora.js --network bscTestnet
```

You'll see:
```
✅ SoraOracle deployed to: 0x...
```

Save this address!

---

## Step 4: Ask Your First Question

Run the interactive ask script:

```bash
npx hardhat run scripts/sora-ask.js --network bscTestnet 0xYOUR_ORACLE_ADDRESS
```

Or use the npm command:

```bash
npm run sora:ask
```

This will ask 3 example questions automatically.

---

## Step 5: Provide an Answer (Oracle Provider)

```bash
npx hardhat run scripts/sora-answer.js --network bscTestnet
```

---

## Step 6: Update TWAP Prices

Update prices for configured pairs:

```bash
npx hardhat run scripts/update-twap.js --network bscTestnet
```

Or start auto-updating every 5 minutes:

```bash
npm run sora:auto-update
```

---

## 🎯 What's Next?

### Build a Prediction Market

Check out the example:
```
examples/prediction-markets/basic-market.sol
```

Deploy it:
```bash
npx hardhat run examples/prediction-markets/deploy-market.js --network bscTestnet
```

### Integrate into Your DeFi Protocol

See:
```
examples/integrations/defi-lending.sol
```

### Set Up Auto-Updates

Keep your TWAP prices fresh:
```bash
npm run sora:auto-update
```

---

## 📚 Learn More

- **[Full Documentation](./docs/SDK_GUIDE.md)** - Complete integration guide
- **[TWAP Guide](./docs/TWAP_GUIDE.md)** - Understanding TWAP oracles
- **[Examples](./examples/)** - Real-world integrations

---

## 🆘 Need Help?

- Check [docs/](./docs/) for detailed guides
- Open an [issue on GitHub](https://github.com/yourusername/sora-oracle/issues)
- Read the [FAQ](./docs/FAQ.md)

---

## ⚡ Quick Commands Reference

```bash
# Testing
npm test                    # Run all tests

# Deployment
npx hardhat run scripts/deploy-sora.js --network bscTestnet

# Interaction
npx hardhat run scripts/ask-question.js --network bscTestnet
npx hardhat run scripts/answer-question.js --network bscTestnet
npx hardhat run scripts/check-prices.js --network bscTestnet

# Verification
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

**You're ready to build!** 🎉

Start with the examples, read the docs, and build something amazing!
