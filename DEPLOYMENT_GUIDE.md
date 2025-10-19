# Sora Oracle - Deployment Guide

## Prerequisites

1. **Node.js** - v18 or higher
2. **Hardhat** - Installed via npm
3. **BNB** - For deployment (testnet or mainnet)
4. **Private Key** - For deploying account

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# Required for deployment
PRIVATE_KEY=your_private_key_here

# Optional: Set oracle provider (defaults to deployer)
ORACLE_PROVIDER_ADDRESS=0x...

# Optional: BSCScan API key for contract verification
BSCSCAN_API_KEY=your_api_key_here
```

⚠️ **Never commit your `.env` file!**

### 3. Fund Your Account

#### BSC Testnet
- Get free BNB from: https://testnet.bnbchain.org/faucet-smart
- You need ~0.1 BNB for deployment

#### BSC Mainnet  
- Purchase BNB from an exchange
- Transfer to your deploying account
- You need ~0.5-1 BNB for deployment + initial operations

## Deployment

### Deploy to BSC Testnet

```bash
npm run deploy:sora
```

This will:
1. Deploy SoraOracle contract
2. Set up TWAP oracles for major pairs (WBNB/BUSD, WBNB/USDT, CAKE/WBNB)
3. Display contract addresses
4. Show verification commands

**Expected Output:**

```
🚀 Deploying Sora Oracle MVP to BSC...

Deploying with account: 0x1234...5678
Account balance: 0.5 BNB

Oracle Provider: 0x1234...5678
📝 Deploying SoraOracle...
✅ SoraOracle deployed to: 0xABCD...EF01

📊 Setting up TWAP oracles for trading pairs...
✅ WBNB/BUSD TWAP oracle added
✅ WBNB/USDT TWAP oracle added
✅ CAKE/WBNB TWAP oracle added

============================================================
🎉 Sora Oracle MVP Deployment Complete!
============================================================

📋 Contract Addresses:
SoraOracle: 0xABCD...EF01
```

### Deploy to BSC Mainnet

1. Update `hardhat.config.js` to use mainnet
2. Make sure you have sufficient BNB
3. Run:

```bash
npx hardhat run scripts/deploy-sora.js --network bscMainnet
```

## Post-Deployment

### 1. Verify Contract on BscScan

```bash
npx hardhat verify --network bscTestnet <ORACLE_ADDRESS> <ORACLE_PROVIDER_ADDRESS>
```

Example:
```bash
npx hardhat verify --network bscTestnet 0xABCD...EF01 0x1234...5678
```

### 2. Test the Oracle

#### Ask a Question

```bash
npx hardhat run scripts/sora-ask.js <ORACLE_ADDRESS> --network bscTestnet
```

This will submit 3 example questions:
- General market sentiment question
- Price question (TWAP-compatible)
- Yes/No prediction question

#### Provide Answers (As Oracle Provider)

```bash
# Answer question #0 (general)
npx hardhat run scripts/sora-answer.js <ORACLE_ADDRESS> 0 general --network bscTestnet

# Answer question #1 (price)
npx hardhat run scripts/sora-answer.js <ORACLE_ADDRESS> 1 price --network bscTestnet

# Answer question #2 (yes/no)
npx hardhat run scripts/sora-answer.js <ORACLE_ADDRESS> 2 yesno --network bscTestnet
```

#### Withdraw Earnings

```bash
npx hardhat run scripts/sora-withdraw.js <ORACLE_ADDRESS> --network bscTestnet
```

### 3. Add More TWAP Oracles

You can add TWAP oracles for any PancakeSwap V2 pair:

```javascript
const oracle = await ethers.getContractAt("SoraOracle", ORACLE_ADDRESS);
const pairAddress = "0x..."; // PancakeSwap pair address

const tx = await oracle.addTWAPOracle(pairAddress);
await tx.wait();
```

Find pair addresses:
- PancakeSwap Factory: `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`
- Call `getPair(token0, token1)` to get pair address

## Common Pair Addresses (BSC Mainnet)

| Pair | Address |
|------|---------|
| WBNB/BUSD | `0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16` |
| WBNB/USDT | `0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE` |
| CAKE/WBNB | `0x0eD7e52944161450477ee417DE9Cd3a859b14fD0` |
| ETH/WBNB | `0x74E4716E431f45807DCF19f284c7aA99F18a4fbc` |
| BTC/WBNB | `0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082` |

## Using in Your DApp

### 1. Install Oracle Package

```bash
npm install @openzeppelin/contracts
```

### 2. Import and Use

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SoraOracle.sol";

contract YourContract {
    SoraOracle public oracle;
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    function askQuestion(string memory question) external payable {
        uint256 fee = oracle.oracleFee();
        require(msg.value >= fee, "Insufficient fee");
        
        uint256 deadline = block.timestamp + 24 hours;
        oracle.askYesNoQuestion{value: fee}(question, deadline);
    }
}
```

### 3. Query TWAP Prices

```solidity
// Get WBNB price in BUSD
address pairAddress = 0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16;
address WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
uint256 amount = 1 ether; // 1 WBNB

uint256 busdAmount = oracle.getTWAPPrice(pairAddress, WBNB, amount);
// Returns: amount of BUSD for 1 WBNB
```

## Troubleshooting

### "Insufficient fee" Error

Make sure you're sending at least 0.01 BNB with each question:

```javascript
await oracle.askOracle(question, deadline, {
    value: ethers.parseEther("0.01")
});
```

### "TWAP oracle not set" Error

You need to add a TWAP oracle for that pair first:

```javascript
await oracle.addTWAPOracle(pairAddress);
```

### "Period not elapsed" Error

TWAP oracles need at least 30 minutes between updates. Wait and try again.

### Gas Estimation Failed

- Check you have enough BNB in your account
- Verify contract addresses are correct
- Make sure network is set correctly

## Gas Costs (Approximate)

| Action | Gas | Cost (BNB)* |
|--------|-----|------------|
| Deploy SoraOracle | 3-5M | $5-8 |
| Ask Question | 150k | $0.30 |
| Provide Answer | 100k | $0.20 |
| Withdraw | 50k | $0.10 |
| Add TWAP Oracle | 2M | $4 |

*Based on 5 gwei gas price and $600 BNB

## Security Checklist

- [ ] Never commit private keys to Git
- [ ] Use `.env` for sensitive data
- [ ] Test thoroughly on testnet first
- [ ] Verify contracts on BscScan
- [ ] Set appropriate oracle provider
- [ ] Test refund mechanism
- [ ] Test emergency pause
- [ ] Monitor for suspicious activity

## Support

- **Documentation:** See SORA_README.md
- **Issues:** Check contract events on BscScan
- **Questions:** Review the code and tests

---

**Built for BNB Chain Prediction Markets** 🚀
