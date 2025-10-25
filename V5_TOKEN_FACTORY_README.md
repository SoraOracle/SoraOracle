# Sora Oracle V5.0 - Token Minting Factory

## Overview

V5.0 introduces a fully automated token minting factory for prediction markets on BNB Chain with integrated x402 micropayments. This allows anyone in the community to launch viral prediction markets with custom ERC-20 tokens in seconds.

## Features

- ✅ **Automated Token Deployment** - Deploy ERC-20 tokens for any prediction market
- ✅ **Oracle Validation** - Automatically verify oracle feeds before minting
- ✅ **x402 Micropayments** - Charge $0.05 USDC for market creation
- ✅ **Gas Optimized** - Under 500k gas on BNB Chain
- ✅ **Symbol Generation** - "BTC-100K" → "BTC100K"
- ✅ **Metadata Export** - JSON files with ABIs and deployment info
- ✅ **Open Source** - MIT license, ready for community forks

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Add to `.env`:
```
PRIVATE_KEY=your_wallet_private_key
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
TOKEN_FACTORY_ADDRESS=deployed_factory_address
ORACLE_ADDRESS=0x4124227dEf2A0c9BBa315dF13CD7B546f5839516
ORACLE_FEED_ADDRESS=your_oracle_feed_address
```

### 3. Deploy Contracts

Deploy to BNB testnet:
```bash
npx hardhat run scripts/deploy-testnet.ts --network bscTestnet
```

### 4. Launch a Market

```bash
node examples/launch.ts --market "BTC-100K" --supply 1000000000
```

## Usage Examples

### Deploy a Market Token

```typescript
import { TokenFactory } from '@sora-oracle/sdk';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const factory = new TokenFactory({
  provider,
  factoryAddress: process.env.TOKEN_FACTORY_ADDRESS,
  oracleClient,
  signer
});

// Deploy market token with oracle validation
const deployment = await factory.deployToken(
  "BTC-100K",           // Market name
  1000000000,           // Initial supply (1B tokens)
  oracleAddress         // Oracle feed for BTC price
);

console.log(`Token deployed: ${deployment.address}`);
console.log(`Symbol: ${deployment.symbol}`);  // "BTC100K"
console.log(`Metadata: output/tokens/${deployment.symbol}_${deployment.address.slice(0, 8)}.json`);
```

### x402 Payment Integration

Protect market creation with micropayments:

```typescript
import { setupX402 } from '@sora-oracle/sdk/middleware';
import express from 'express';

const app = express();
const x402 = setupX402(app);

// Protected endpoint - requires $0.05 USDC payment
app.post('/launchMarket', x402.requirePayment(), async (req, res) => {
  const { marketName, initialSupply, oracleFeed } = req.body;
  const payment = req.x402Payment;  // Verified payment proof

  const token = await factory.deployToken(marketName, initialSupply, oracleFeed);
  
  res.json({
    success: true,
    tokenAddress: token.address,
    settlementHash: payment.nonce
  });
});

app.listen(3001);
```

### Client-Side Payment Flow

```typescript
import { X402Middleware } from '@sora-oracle/sdk/middleware';

// Create payment proof
const payment = await X402Middleware.createPaymentProof({
  amount: 0.05,
  token: USDC_ADDRESS,
  to: PAYMENT_RECIPIENT,
  from: userAddress,
  privateKey: userPrivateKey
});

// Call protected endpoint with payment
const response = await fetch('http://localhost:3001/launchMarket', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-402-Payment': JSON.stringify(payment)
  },
  body: JSON.stringify({
    marketName: 'BTC-100K',
    initialSupply: 1000000000,
    oracleFeed: oracleFeedAddress
  })
});

const result = await response.json();
console.log('Token address:', result.tokenAddress);
```

## Smart Contracts

### TokenFactory.sol

Factory contract for deploying ERC-20 market tokens:

```solidity
function createToken(
    string memory marketName,
    uint256 initialSupply,
    address oracleFeed
) external returns (address tokenAddress)
```

**Features:**
- Deploys minimal ERC-20 tokens using OpenZeppelin
- Validates oracle feed address
- Prevents duplicate market names
- Emits TokenCreated events
- Gas optimized for BNB Chain

### PredictionMarketV5.sol

Enhanced prediction market with token factory integration:

```solidity
function createMarket(
    string memory marketQuestion,
    address oracleFeed,
    uint256 resolutionTime,
    uint256 tokenSupply,
    X402PaymentProof memory paymentProof
) external returns (uint256 marketId)
```

**Features:**
- Integrated token minting
- x402 payment verification
- Nonce-based replay protection
- Oracle-based resolution

## API Reference

### TokenFactory SDK

```typescript
class TokenFactory {
  constructor(config: TokenFactoryConfig);
  
  deployToken(
    marketName: string,
    initialSupply: number,
    oracleFeed: string
  ): Promise<TokenDeployment>;
  
  getDeployedTokens(): Promise<string[]>;
  getTokenMetadata(tokenAddress: string): Promise<TokenMetadata>;
}
```

### X402Middleware

```typescript
class X402Middleware {
  constructor(config: X402Config);
  
  requirePayment(): ExpressMiddleware;
  
  static createPaymentProof(config: PaymentConfig): Promise<X402PaymentProof>;
}
```

## Testing

Run the test suite:

```bash
npm test
```

Test files:
- `tests/tokenFactory.test.ts` - Token factory contract tests
- Mocked oracle feeds
- Payment verification
- Gas optimization tests

## Deployment

### BNB Testnet

```bash
npx hardhat run scripts/deploy-testnet.ts --network bscTestnet
```

### BNB Mainnet

1. Update `hardhat.config.ts` with mainnet RPC
2. Ensure sufficient BNB for gas
3. Deploy:
```bash
npx hardhat run scripts/deploy-testnet.ts --network bscMainnet
```

## Use Cases

### 1. Community-Driven Markets
Let anyone launch prediction markets for viral events:
- Sports outcomes
- Political events  
- Crypto price predictions
- Tech product launches

### 2. Tokenized Positions
Each market gets its own tradeable ERC-20 token:
- Trade on DEXs
- Provide liquidity
- Use as collateral

### 3. Spam Prevention
x402 micropayments prevent low-quality market spam:
- $0.05 USDC per market
- Settles via Coinbase facilitator
- Replay attack protection

### 4. Oracle-Backed Markets
Only markets with valid oracle feeds can be created:
- Automatic feed validation
- Freshness checks (< 24 hours)
- Prevents fake markets

## Examples

See `examples/launch.ts` for a complete example showing:
1. x402 payment creation
2. API endpoint call with payment proof
3. Direct token deployment
4. Metadata export

Run it:
```bash
node examples/launch.ts --market "BTC-100K" --supply 1000000000
```

## Community Contributions

We encourage forks and contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Ideas for contributions:**
- New oracle integrations (Chainlink, Band Protocol)
- Enhanced x402 features (retry logic, batch payments)
- Additional market types
- Mobile SDK (React Native)
- Multi-chain support

## Tweet Template

```
Just launched [MARKET_NAME] on @SoraOracle with [SUPPLY] tokens! 🚀

Token: [ADDRESS]
Symbol: [SYMBOL]

Join the BNB prediction market meta with $SORA + x402! 📊

Fork it: [YOUR_REPO]
```

## License

MIT License - See [LICENSE](./LICENSE)

## Resources

- [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
- [x402 Protocol](https://x402.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/)
- [Hardhat Docs](https://hardhat.org/docs)

---

**Built with ❤️ by the Sora Oracle community**

**Let's make prediction markets viral! 🌟**
