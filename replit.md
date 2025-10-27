# Sora Oracle SDK

## Overview

Sora Oracle is a production-ready permissionless oracle SDK for prediction markets on BNB Chain. It features a custom s402 micropayment protocol enabling USDC/USDT payments for oracle API access and market settlements. The system combines AI-powered API discovery, cryptographic verification, and EIP-4337 account abstraction to deliver institutional-grade prediction markets with sub-cent transaction costs.

**Key Innovation:** First fully permissionless oracle with built-in micropayment infrastructure optimized for BNB Chain's technical constraints, supporting unlimited parallel transactions through multi-wallet pooling and smart account abstraction.

**Status:** Live on BNB Chain Mainnet with deployed S402Facilitator contract.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**Smart Contract Layer (23+ Contracts on BNB Chain)**
- `SoraOracle.sol` - Core oracle contract for question/answer management
- `PancakeTWAPOracle.sol` - Manipulation-resistant price feeds using time-weighted average prices
- `SimplePredictionMarket.sol` - Binary outcome prediction markets
- `MultiOutcomeMarket.sol` - Markets supporting 2-10 possible outcomes
- `OrderBookMarket.sol` - Institutional-grade order book trading
- `S402Facilitator.sol` - Micropayment settlement for API access
- Supporting contracts for batch operations, reputation tracking, dispute resolution, automated resolution, payouts, referrals, market factory, and liquidity incentives

**TypeScript SDK Layer**
- Market creation and management
- Betting engine with x402/s402 micropayments
- Oracle resolution with AI integration
- React hooks for frontend integration
- Multi-wallet pool management for parallel transactions

**AI Oracle System**
- Self-expanding research agent with automatic API discovery
- Statistical consensus using Median Absolute Deviation for outlier detection
- Cryptographic verification (TLS certificates, SHA-256 hashing, IPFS storage)
- Automatic reputation tracking and blacklisting of unreliable sources
- Parallel querying of 10+ data sources simultaneously

### Architectural Decisions

**Payment Protocol: s402 (BNB Chain Implementation)**
- **Problem:** BNB Chain USDC/USDT lack EIP-3009 support needed for Coinbase's x402 standard
- **Solution:** Multi-wallet pool (10x speedup) + EIP-4337 account abstraction (unlimited parallelization)
- **Alternative Considered:** Pure EIP-2612 permits (rejected due to sequential nonce bottleneck)
- **Pros:** Unlimited parallel transactions, $0 user gas costs via paymasters, USDC-denominated gas payments
- **Cons:** More complex infrastructure setup than native EIP-3009

**Multi-Wallet Pool Pattern**
- **Problem:** EIP-2612 sequential nonces prevent parallel transaction processing
- **Solution:** 10 worker wallets enable 10x parallel throughput
- **Implementation:** Master wallet distributes USDC to workers, each handles independent transaction streams
- **Benefit:** Overcomes BNB Chain USDC limitations while maintaining decentralization

**Smart Account Migration Path (EIP-4337)**
- **Current:** Multi-wallet pool for immediate deployment
- **Future:** Full EIP-4337 smart accounts with 192-dimensional nonces for true unlimited parallelization
- **Strategy:** Infrastructure-ready design allows seamless migration when BNB Chain bundler support matures

**Permissionless Oracle Design**
- **Problem:** Traditional oracles require stake deposits and manual API registration
- **Solution:** AI-powered discovery + statistical consensus + cryptographic verification
- **Approach:** No sign-ups, no stakes, fully automated trust through mathematical verification
- **Trade-off:** Higher computational cost for consensus vs. instant staked oracle responses

**Network Choice: BNB Chain**
- **Rationale:** 85% lower fees than Ethereum, robust DeFi ecosystem, PancakeSwap liquidity
- **Gas Strategy:** ~$0.003 per transaction vs ~$0.01 on Base, ~$0.05 on Ethereum
- **Optimization:** viaIR compiler flag, 200 optimizer runs for production efficiency

## External Dependencies

### Blockchain Infrastructure
- **BNB Chain Mainnet** (Chain ID 56) - Primary deployment network
- **BNB Chain Testnet** (Chain ID 97) - Development and testing
- **PancakeSwap V2** - Liquidity source for TWAP price oracles
  - Factory: `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` (Mainnet)
  - WBNB/BUSD pair: `0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16`
  - WBNB/USDT pair: `0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE`

### Stablecoins
- **USDC (Binance Bridged)** - `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
  - Type: Bridged token (NOT native Circle USDC)
  - Standards: EIP-20 (standard transfers), EIP-2612 (likely supported, to be verified)
  - Limitations: NO EIP-3009 support (no random nonces)
- **USDT (BSC-USD Tether)** - `0x55d398326f99059fF775485246999027B3197955`
  - Standards: EIP-20 only
  - Limitations: NO EIP-2612, NO EIP-3009

### AI and Data Services
- **OpenAI API** (GPT-4) - Market outcome verification and research
  - Configuration: Via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Purpose: Natural language question analysis, consensus generation
- **IPFS** - Cryptographic data storage
  - Providers: Pinata (production) or mock fallback
  - Configuration: `IPFS_PROVIDER=pinata`, `PINATA_JWT=<token>`
- **API Discovery Services**
  - APIs.guru - Public API directory search
  - RapidAPI - Commercial API marketplace (requires account)

### Development Tools
- **Hardhat** - Smart contract compilation and deployment
  - Solidity: 0.8.20
  - Optimizer: Enabled with 200 runs + viaIR
  - Networks: BSC Testnet, BSC Mainnet
- **OpenZeppelin Contracts** (v5.4.0) - Ownable, ReentrancyGuard
- **Ethers.js** (v6.13.0) - Ethereum interactions
- **Viem** (v2.38.4) - Modern Ethereum library
- **React** (v18.3.1) - Frontend framework
- **Vite** (v6.0.7) - Frontend build tool

### Third-Party Services
- **BSCScan API** - Contract verification
  - Configuration: `BSCSCAN_API_KEY`
  - Status: Currently broken (v1 deprecated Oct 2024, v2 not yet available)
- **External Data APIs** (via s402 payments)
  - CoinGecko - Cryptocurrency price data
  - OpenWeatherMap - Weather data
  - NewsAPI - News events
  - Alpha Vantage - Financial market data

### Node Dependencies
- express (v5.1.0) - HTTP server for API gateway
- cors (v2.8.5) - Cross-origin resource sharing
- pg (v8.16.3) - PostgreSQL client (for future state management)
- drizzle-kit - Database schema management
- node-fetch (v3.3.2) - HTTP requests
- x402-express (v0.6.5) - Coinbase's official x402 middleware (reference implementation)