# Sora Oracle SDK

## Overview

Sora Oracle is a permissionless oracle SDK for prediction markets on BNB Chain. The system enables trustless data feeds through AI-powered API discovery, cryptographic verification, and HTTP 402 micropayments using USD1 (World Liberty Financial stablecoin). The platform supports multiple market types including binary outcomes, multi-outcome markets, AMMs, and orderbooks, with automated settlement through AI research agents.

The SDK provides TypeScript/JavaScript bindings for React applications and includes a complete smart contract suite deployed on BNB Chain mainnet. The system uses EIP-2612 permit signatures for gasless USD1 payments and supports parallel transaction processing through multi-wallet pools.

## Recent Updates (October 28, 2025)

- ✅ **CRITICAL FIX**: Switched from Binance-Bridged USDC to USD1 (World Liberty Financial)
  - Binance USDC lacks EIP-2612 permit support (blocker for gasless payments)
  - USD1 has full EIP-2612 support with 18 decimals on BSC mainnet
  - Contract address: 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d
  - 268K+ holders, $2.9B market cap, backed by US Treasuries
- ✅ Added collapsible "Buy USD1" widget powered by 1inch DEX aggregator
  - Users can swap any token (BNB, BUSD, USDT, etc.) for USD1 directly on the S402 page
  - Dark theme integration matching S402 design system
  - Collapsed by default to keep UI clean
- ✅ S402Facilitator v2 deployed to BNB Chain mainnet at 0x75c8CCD195F7B5Fb288B107B45FaF9a1289d7Df1
- ✅ Contract successfully verified on BSCScan
- ✅ Refactored contract to use PaymentData and Signature structs (eliminates stack too deep errors)
- ✅ Contract compiles without viaIR, enabling BSCScan verification
- ✅ All documentation updated with USD1 integration
- ✅ SDK configuration updated with verified mainnet contract

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Smart Contract Layer

**Core Oracle Contract (SoraOracle.sol)**
- Question submission with configurable bounties and deadlines
- Answer provision with confidence scoring and data source tracking
- Oracle provider rewards distribution
- Pausable design pattern for emergency stops
- TWAP (Time-Weighted Average Price) oracle integration for PancakeSwap pairs
- Refund mechanism for unanswered questions after deadline

**S402 Payment Facilitator (S402Facilitator.sol)**
- EIP-2612 permit-based USD1 transfers on BNB Chain
- Platform fee collection (1% on mainnet)
- Payment verification and settlement tracking
- Support for USD1 - World Liberty Financial (0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d, 18 decimals)

**Prediction Market Contracts**
- SimplePredictionMarket: Binary outcome markets with YES/NO bets
- MultiOutcomeMarket: Markets with multiple possible outcomes
- BatchPayoutDistributor: Gas-efficient bulk reward distribution
- MarketFactory: Standardized market creation interface
- AutomatedMarketResolver: AI-powered automated settlement

**Advanced Features**
- BatchOracleOperations: Submit multiple questions in one transaction
- OracleReputationTracker: Provider reliability scoring
- DisputeResolution: Contestable outcomes with arbitration
- ReferralRewards: User acquisition incentives
- LiquidityIncentives: Market maker rewards

### AI Research & Settlement

**Self-Expanding Research Agent**
- Dynamic API discovery through RapidAPI and APIs.guru
- Category-based data source routing (crypto, weather, news, finance)
- Statistical consensus across multiple data sources
- Automatic API registration for future use
- Confidence scoring and verification thresholds

**Market Quality Evaluation**
- Automated question quality scoring (verifiability, clarity, feasibility, legitimacy)
- Auto-approve threshold: 70+ points
- Auto-reject threshold: <40 points
- Manual review queue for borderline cases

**Settlement Process**
- OpenAI GPT-4 integration for outcome verification
- Multi-source data aggregation
- IPFS storage for research proofs (supports Pinata or local mock)
- TLS certificate verification for data authenticity
- Minimum confidence threshold: 80-90%

### Multi-Wallet Parallelization

**Problem Solved**: EIP-2612 permit signatures use sequential nonces, limiting to 1 transaction per block per wallet

**Solution**: Multi-wallet worker pool
- Master wallet funds 10 worker wallets with USD1
- Parallel s402 payment processing (10x speedup)
- Automatic worker balance monitoring and refunding
- Round-robin wallet selection for operations

**Alternative Explored**: EIP-4337 smart accounts for unlimited parallelization (conceptual, requires bundler/paymaster infrastructure)

### Frontend Architecture

**Technology Stack**
- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Ethers.js v6 for blockchain interaction
- 1inch Embedded Widget for token swaps

**SDK Integration (@sora-oracle/sdk)**
- React hooks for market data (useMarkets, useMarketDetails)
- TypeScript client classes (OracleClient, PredictionMarketSDK, X402Client)
- Automatic wallet connection handling
- Real-time market updates

**Buy USD1 Integration**
- 1inch DEX aggregator widget (@1inch/embedded-widget)
- Collapsible UI section with arrow indicator
- Swap any BSC token to USD1 with best rates
- Dark theme matching S402 design (#0A0A0A background, #F97316 accents)

### Payment Gateway (x402 Express Integration)

**Gateway Architecture**
- Express.js server accepting s402 payments from agents
- Proxies requests to external APIs (CoinGecko, OpenWeather, NewsAPI, AlphaVantage)
- Revenue model: Agent pays $0.03, external API costs $0.02, gateway profits $0.01
- Cost tracking and analytics per API and payer
- Official x402-express middleware for payment verification

### Database Layer

**Technology**: PostgreSQL with Drizzle ORM

**Schema Considerations**
- Market metadata and historical data
- User bet tracking and positions
- Oracle question/answer history
- Worker wallet balances and transaction logs
- API discovery cache

**Note**: Database schema not fully defined in codebase; application may add Postgres later through Drizzle migrations.

## External Dependencies

### Blockchain Infrastructure

**BNB Chain (BSC)**
- Mainnet Chain ID: 56
- Testnet Chain ID: 97
- RPC Endpoints: Binance public nodes
- Gas Token: BNB

**Smart Contract Deployments**
- S402Facilitator (Mainnet): 0x75c8CCD195F7B5Fb288B107B45FaF9a1289d7Df1 (verified on BSCScan)
- Multiple prediction market contracts on testnet

**Token Standards**
- ERC-20 USD1 (World Liberty Financial): 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d (18 decimals)
- EIP-2612: Permit signatures for gasless approvals (FULL SUPPORT)
- Previous attempt with Binance USDC (0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d) failed - lacks EIP-2612

### DeFi Integrations

**PancakeSwap V2**
- Factory: 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73 (mainnet)
- TWAP oracles for BNB/BUSD, BNB/USDT, CAKE/BNB pairs
- 5-minute update intervals for manipulation resistance

### AI Services

**OpenAI API**
- Model: GPT-4o
- Uses: Market quality evaluation, outcome verification, API discovery
- Temperature: 0.1 (deterministic responses)
- JSON mode for structured outputs

**API Discovery Services**
- RapidAPI: Browse and search public APIs
- APIs.guru: OpenAPI directory for discovering data sources
- Dynamic category mapping (crypto → CoinGecko/CryptoCompare, weather → OpenWeather)

### Data Storage

**IPFS**
- Providers: Pinata (production) or local mock (development)
- Purpose: Immutable storage of research proofs and settlement data
- CID generation: SHA-256 hashing for data integrity

**TLS Verification**
- Real HTTPS certificate checks for API authenticity
- Validates data source credibility before settlement

### Development Tools

**Hardhat**: Ethereum development environment
- Solidity 0.8.20 compiler
- Network configurations for BSC mainnet/testnet
- Contract deployment and verification scripts

**TypeScript/Node.js**: SDK and tooling
- tsup for SDK compilation
- Express for gateway server
- dotenv for configuration

**BSCScan API**: Contract verification (currently broken, awaiting v2 API release)