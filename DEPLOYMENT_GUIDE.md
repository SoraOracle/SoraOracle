# BSC Oracle Contract - Deployment Guide

## Step 1: Set Up Your Wallet

You'll need a wallet with a private key to deploy the contract.

### Option A: Use MetaMask (Recommended)
1. Install MetaMask browser extension
2. Create or import a wallet
3. Go to Account Details → Export Private Key
4. **Keep this private key secure!**

### Option B: Create a New Wallet
```bash
npx hardhat console
# In the console:
const wallet = ethers.Wallet.createRandom()
console.log("Address:", wallet.address)
console.log("Private Key:", wallet.privateKey)
```

## Step 2: Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
PRIVATE_KEY=your_64_character_private_key_here
BSCSCAN_API_KEY=optional_for_verification
ORACLE_PROVIDER_ADDRESS=your_wallet_address_or_leave_blank
```

**Important:** 
- Remove the `0x` prefix from your private key
- If you don't specify ORACLE_PROVIDER_ADDRESS, it will use your deployer address

## Step 3: Get Testnet BNB

1. Visit the BNB Chain Testnet Faucet:
   **https://testnet.bnbchain.org/faucet-smart**

2. Enter your wallet address
3. Complete the captcha
4. You'll receive 0.1-0.5 testnet BNB (free!)

**Verify you received the BNB:**
Check your address on: https://testnet.bscscan.com/address/YOUR_ADDRESS

## Step 4: Deploy to Testnet

Run the deployment script:

```bash
npm run deploy:testnet
```

**Expected Output:**
```
Deploying ImprovedOracle to BSC Testnet...

Deploying with account: 0x1234...5678
Account balance: 0.5 BNB

Oracle Provider Address: 0x1234...5678

✅ ImprovedOracle deployed to: 0xABCD...EF01

📝 Next steps:
1. Get free testnet BNB from: https://testnet.bnbchain.org/faucet-smart
2. View your contract on BscScan: https://testnet.bscscan.com/address/0xABCD...EF01
3. Verify your contract with: npx hardhat verify --network bscTestnet 0xABCD...EF01 0x1234...5678
```

**Save your contract address!** You'll need it for all interactions.

## Step 5: Verify Contract (Optional but Recommended)

Contract verification makes your source code public on BscScan:

```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <ORACLE_PROVIDER_ADDRESS>
```

Replace `<CONTRACT_ADDRESS>` with your deployed contract address.

## Step 6: Test Your Oracle

### Ask a Question

```bash
npx hardhat run scripts/interact.js <CONTRACT_ADDRESS> --network bscTestnet
```

This will:
- Ask a sample question
- Pay a 0.01 BNB bounty
- Display the question details

### Provide an Answer (as Oracle Provider)

```bash
npx hardhat run scripts/answer.js <CONTRACT_ADDRESS> <QUESTION_ID> "Your answer here" --network bscTestnet
```

### Withdraw Earnings

```bash
npx hardhat run scripts/withdraw.js <CONTRACT_ADDRESS> --network bscTestnet
```

## Common Issues & Solutions

### Issue: "Insufficient funds"
- **Solution:** Get more testnet BNB from the faucet

### Issue: "Invalid private key"
- **Solution:** Make sure you copied the full key without the `0x` prefix

### Issue: "Transaction underpriced"
- **Solution:** Increase gas price in `hardhat.config.js` (change `gasPrice: 20000000000` to higher)

### Issue: "Only oracle provider can call this"
- **Solution:** You're trying to answer/withdraw with a different wallet. Use the oracle provider wallet.

## Deploy to Mainnet

**⚠️ WARNING: Mainnet uses REAL BNB with real value!**

1. **Test thoroughly on testnet first!**
2. Get real BNB (buy from an exchange)
3. Deploy:
   ```bash
   npm run deploy:mainnet
   ```

**Deployment Cost:** ~0.002-0.01 BNB (~$2-10 USD)

## Security Best Practices

✅ **DO:**
- Test everything on testnet first
- Keep your private key secure
- Use a hardware wallet for mainnet
- Start with small amounts
- Verify contracts on BscScan

❌ **DON'T:**
- Share your private key
- Commit `.env` to git
- Deploy to mainnet without testing
- Use the same wallet for dev and production

## Network Information

### BSC Testnet
- **RPC URL:** https://data-seed-prebsc-1-s1.binance.org:8545
- **Chain ID:** 97
- **Explorer:** https://testnet.bscscan.com
- **Faucet:** https://testnet.bnbchain.org/faucet-smart

### BSC Mainnet
- **RPC URL:** https://bsc-dataseed.binance.org/
- **Chain ID:** 56
- **Explorer:** https://bscscan.com

## Need Help?

- Check the README.md for feature documentation
- Visit BNB Chain docs: https://docs.bnbchain.org
- View your transactions on BscScan
- Check contract source code in `contracts/ImprovedOracle.sol`

---

🎉 **You're all set!** Your oracle contract is ready to deploy on BSC testnet.
