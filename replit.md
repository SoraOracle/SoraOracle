# Sora Oracle SDK

## Overview

Sora Oracle is a permissionless oracle SDK for prediction markets on BNB Chain (BSC). It features the s402 micropayment protocol for USDC-based API access, AI-powered API discovery for trustless data verification, and a comprehensive suite of 23 smart contracts supporting various market types (binary, multi-outcome, AMM, orderbook, conditional).

The system enables developers to create prediction markets with oracle-verified outcomes, gasless transactions through account abstraction, and institutional-grade trading capabilities optimized for BNB Chain's infrastructure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**1. Smart Contract Layer (Solidity 0.8.20)**
- **SoraOracle.sol** - Main oracle contract for question/answer management
- **SimplePredictionMarket.sol** - Binary outcome prediction markets
- **MultiOutcomeMarket.sol** - Markets with 2-10 possible outcomes
- **OrderBookMarket.sol** - Institutional trading with limit orders
- **S402Facilitator.sol** - Micropayment settlement using EIP-2612 permits
- **PancakeTWAPOracle.sol** - Manipulation-resistant price feeds from PancakeSwap
- **BatchOracleOperations.sol** - Gas-optimized batch question processing
- Additional contracts for market creation, dispute resolution, reputation tracking, referrals, and liquidity incentives

**2. Payment Architecture (s402 Protocol)**
- Uses EIP-2612 permit-based approvals instead of EIP-3009 (not available on BNB Chain)
- Multi-wallet pool system (10 worker wallets) to overcome sequential nonce limitations and achieve 10x parallelization
- EIP-4337 account abstraction support for unlimited parallel transactions via multidimensional nonces
- Paymaster pattern allows USDC or BNB payment for gas fees
- Platform fee: 1% (100 basis points) on all transactions

**3. AI Oracle System**
- **SelfExpandingResearchAgent** - Autonomous API discovery and verification
- **IntelligentResearchAgent** - Dynamic data source routing based on question type
- Permissionless design: No manual API registration or stakes required
- Statistical consensus using Median Absolute Deviation (MAD) for outlier detection
- Cryptographic verification: TLS certificate validation + SHA-256 hashing + IPFS storage
- Automatic reputation tracking and blacklisting of unreliable sources
- Integration with OpenAI GPT-4 for answer synthesis and confidence scoring

**4. SDK Layer (TypeScript)**
- React hooks for zero-boilerplate frontend integration
- Multi-wallet pool management for parallel transactions
- X402Client for micropayment handling
- Market creation, betting, and resolution helpers
- Support for both EIP-2612 and EIP-4337 payment methods

**5. Frontend (React + Vite)**
- Modern React 18 application with TypeScript
- Wallet connection via ethers.js v6
- Real-time market data and odds visualization
- Responsive design for mobile and desktop

### Key Architectural Decisions

**BNB Chain Selection**
- Chosen for low transaction costs (~$0.003 per tx vs ~$0.01 on Base)
- High throughput for micropayment operations
- Established DeFi ecosystem with PancakeSwap integration
- Trade-off: BNB Chain USDC lacks EIP-3009 support, requiring workarounds

**s402 vs x402 Protocol**
- s402 is Sora's implementation for BNB Chain (not Coinbase's x402 standard)
- Uses EIP-2612 permits for backward compatibility with Binance Bridged USDC
- Multi-wallet pool compensates for sequential nonce limitation
- Honest branding: Documentation clearly states "s402" to avoid confusion with Coinbase's x402

**Permissionless Oracle Design**
- No sign-ups, stakes, or manual API registration required
- AI discovers APIs dynamically from directories (RapidAPI, APIs.guru)
- Statistical consensus prevents manipulation without centralized authority
- Self-healing through reputation scores and automatic blacklisting
- Trade-off: Requires OpenAI API access for question analysis

**Smart Contract Architecture**
- Modular design with 23 specialized contracts rather than monolithic
- Separation of concerns: oracle, markets, payments, governance
- Upgrade path through contract replacement (not proxies)
- Gas optimization via batch operations and via-IR compilation

### Network Configuration

**Supported Networks:**
- BNB Chain Mainnet (Chain ID: 56)
- BNB Testnet (Chain ID: 97)

**RPC Endpoints:**
- Mainnet: `https://bsc-dataseed.binance.org/`
- Testnet: `https://data-seed-prebsc-1-s1.binance.org:8545`

**Gas Configuration:**
- Gas price: 20 Gwei (hardcoded in hardhat.config.js)
- Optimizer enabled with 200 runs
- Via-IR compilation for additional gas savings

## External Dependencies

### Blockchain Infrastructure

**BNB Chain**
- Primary deployment network
- PancakeSwap V2 Factory: `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` (mainnet)
- Binance Bridged USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (mainnet)
- BSCScan API for contract verification

**Smart Contract Libraries**
- OpenZeppelin Contracts v5.4.0 (Ownable, ReentrancyGuard, ERC20)
- Hardhat toolbox v5.0.0 for development and testing

### AI and Data Services

**OpenAI**
- GPT-4o model for oracle answer synthesis
- Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` environment variable
- Custom base URL support via `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Used for: Question analysis, answer verification, search query generation, confidence scoring

**API Discovery**
- APIs.guru directory for discovering public APIs
- RapidAPI marketplace integration (optional)
- No API keys required for discovery phase

**IPFS Storage**
- Optional Pinata integration for cryptographic proofs
- Configured via `IPFS_PROVIDER=pinata` and `PINATA_JWT`
- Fallback to mock implementation using SHA-256 hashing

### Payment Infrastructure

**USDC Token**
- Binance Bridged USDC on BNB Chain
- EIP-2612 permit support for gasless approvals
- Does NOT support EIP-3009 random nonces

**EIP-4337 Bundlers (Future)**
- Biconomy, Safe, or Particle Network for smart account support
- Required for unlimited parallel transactions
- Currently in planning phase (multi-wallet pool used as interim solution)

### Development Tools

**Build and Deploy**
- Hardhat v2.22.18 for compilation and deployment
- TypeScript v5.6.3 for SDK and frontend
- Vite v6.0.7 for frontend bundling
- Node.js v16+ required

**Database (Optional)**
- PostgreSQL v8.16.3 for market data persistence
- Drizzle ORM for type-safe database access
- Not required for core oracle functionality

**API Gateway (Optional)**
- Express v5.1.0 for x402 gateway server
- CORS support for cross-origin requests
- Cost tracking for revenue/expense monitoring

### Web3 Libraries

**ethers.js v6.13.0**
- Primary Web3 library for blockchain interactions
- Used in SDK, scripts, and frontend

**viem v2.38.4**
- Alternative Web3 library (available but not primary)
- Used for specific account abstraction features

**Other Dependencies**
- node-fetch v3.3.2 for HTTP requests
- recharts v3.3.0 for data visualization
- react-router-dom v7.1.3 for frontend routing