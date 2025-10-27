# Sora Oracle SDK

## Overview

Sora Oracle is a production-ready permissionless oracle SDK for prediction markets on BNB Chain. The system enables trustless data feeds through AI-powered API discovery and cryptographic verification, combined with a custom s402 micropayment protocol for USDC/USDT payments.

**Core Innovation:** First permissionless oracle with built-in micropayment infrastructure optimized for BNB Chain's technical constraints, delivering institutional-grade prediction markets with sub-cent transaction costs.

**Key Components:**
- 23 production-ready smart contracts for various market types (binary, multi-outcome, AMM, orderbook, conditional)
- TypeScript SDK with React hooks for frontend integration
- Self-expanding AI research agent for automated oracle resolution
- s402 micropayment layer using EIP-4337 account abstraction
- Multi-wallet parallelization achieving 10x transaction speedup

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Smart Contract Layer

**Core Oracle System:**
- `SoraOracle.sol` - Main oracle contract managing questions, answers, and bounties
- `PancakeTWAPOracle.sol` - Manipulation-resistant price oracle using time-weighted average prices from PancakeSwap
- `BatchOracleOperations.sol` - Enables batching multiple oracle queries in single transaction

**Market Types:**
- `SimplePredictionMarket.sol` - Binary outcome markets (YES/NO)
- `MultiOutcomeMarket.sol` - Markets with 2-10 possible outcomes
- `OrderBookMarket.sol` - Institutional-grade order book trading
- `MarketFactory.sol` - Factory pattern for creating new markets

**Advanced Features:**
- `DisputeResolution.sol` - Handles oracle answer disputes
- `OracleReputationTracker.sol` - Tracks oracle provider reputation
- `AutomatedMarketResolver.sol` - Automatic market settlement
- `BatchPayoutDistributor.sol` - Efficient batch payout distribution
- `ReferralRewards.sol` - Referral incentive system
- `LiquidityIncentives.sol` - Liquidity mining rewards

**Deployment Strategy:**
- Solidity 0.8.20 with optimizer enabled (200 runs)
- IR-based compilation for gas optimization
- Deployed on BNB Chain mainnet (Chain ID: 56) and testnet (Chain ID: 97)

### s402 Micropayment Protocol

**Architecture Decision: EIP-4337 + EIP-2612**

Unlike x402 (Coinbase's implementation using EIP-3009 on Base/Ethereum), Sora Oracle uses a hybrid approach optimized for BNB Chain:

- **Problem:** BNB Chain's bridged USDC/USDT tokens lack EIP-3009 `transferWithAuthorization` support
- **Solution:** Multi-wallet pool with EIP-2612 `permit()` for parallelization, transitioning to EIP-4337 smart accounts
- **Result:** 10x speedup over sequential transactions, ~$0.003 per transaction on BNB Chain

**Payment Flow:**
1. User signs EIP-2612 permit (gasless approval)
2. Worker wallet from pool executes transfer
3. Facilitator settles payment
4. API access granted

**Smart Contracts:**
- `S402Facilitator.sol` - Payment settlement and routing
- Multi-wallet pool strategy using 10+ worker wallets
- 1% platform fee (100 basis points)

### AI Oracle System

**Self-Expanding Research Agent:**

The AI system autonomously discovers and verifies data sources without manual API registration:

1. **API Discovery** - Uses APIs.guru and RapidAPI to find relevant endpoints based on question analysis
2. **Parallel Querying** - Queries 10+ sources simultaneously
3. **Statistical Consensus** - Uses Median Absolute Deviation (MAD) for outlier detection
4. **Cryptographic Verification** - TLS certificate verification + SHA-256 hashing + IPFS storage
5. **Reputation Tracking** - Automatic blacklisting of unreliable sources
6. **Self-Healing** - System learns from failures and improves over time

**Key Files:**
- `src/ai/SelfExpandingResearchAgent.ts` - Main AI agent (500+ lines)
- `src/ai/APIDiscoveryAgent.ts` - Automated API discovery
- `src/ai/DataSourceRouter.ts` - Intelligent routing based on question category
- `src/ai/TLSVerifier.ts` - HTTPS certificate verification
- `src/ai/IPFSClient.ts` - Decentralized data storage

**OpenAI Integration:**
- Uses GPT-4 for question analysis and answer generation
- Web search capability for real-time data verification
- Configurable confidence thresholds (default: 90%)

### Frontend Architecture

**Technology Stack:**
- React 18.3+ with TypeScript
- Vite for build tooling
- React Router for navigation
- Ethers.js 6.x for blockchain interaction

**SDK Integration:**
- Local package reference: `@sora-oracle/sdk` (file:../sdk)
- Zero-boilerplate React hooks
- Automatic wallet connection handling

**Configuration:**
- Hosted on port 5000 with 0.0.0.0 binding for Replit compatibility
- TypeScript strict mode enabled
- Path aliases: `@/` for src, `@assets/` for assets

### Backend Infrastructure

**Hardhat Development Environment:**
- Network configurations for BSC Testnet (97) and Mainnet (56)
- Gas price: 20 Gwei
- Contract verification via BSCScan API
- Environment-based private key management

**Scripts Organization:**
- Deployment scripts for testnet and mainnet
- AI oracle settler for automated market resolution
- Batch operations for efficient multi-query processing
- Worker wallet funding and balance monitoring

## External Dependencies

### Blockchain Infrastructure

**BNB Chain:**
- Primary network: BSC Mainnet (Chain ID: 56)
- Development network: BSC Testnet (Chain ID: 97)
- RPC Endpoints:
  - Mainnet: `https://bsc-dataseed.binance.org/`
  - Testnet: `https://data-seed-prebsc-1-s1.binance.org:8545`

**PancakeSwap Integration:**
- Factory: `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` (mainnet)
- TWAP oracles for WBNB/BUSD, WBNB/USDT, CAKE/WBNB pairs
- 5-minute observation windows for price manipulation resistance

### Stablecoins

**USDC (Binance-Bridged):**
- Mainnet: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
- Testnet: `0x64544969ed7EBf5f083679233325356EbE738930`
- EIP-2612 compatible (gasless permits)
- No EIP-3009 support (uses workaround)

**USDT:**
- Mainnet: `0x55d398326f99059fF775485246999027B3197955`
- No EIP-2612 or EIP-3009 support
- Standard ERC-20 only

### AI & API Services

**OpenAI:**
- Model: GPT-4 (gpt-4o)
- Used for question analysis and oracle resolution
- Required environment variables:
  - `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY`
  - `AI_INTEGRATIONS_OPENAI_BASE_URL` (optional)

**API Discovery:**
- APIs.guru - Open API directory for automatic discovery
- RapidAPI - Premium API marketplace integration
- Free data sources prioritized, paid fallbacks available

**IPFS Storage:**
- Pinata support (requires `PINATA_JWT`)
- Mock fallback using SHA-256 hashing
- Used for cryptographic proof storage

### Development Tools

**Core Dependencies:**
- Hardhat 2.22+ for smart contract development
- OpenZeppelin Contracts 5.4+ for secure base implementations
- Ethers.js 6.x for blockchain interactions
- Viem 2.38+ for modern web3 utilities

**EIP-4337 Infrastructure:**
- Biconomy bundler/paymaster (coming soon to BNB Chain)
- Account abstraction SDK: `@base-org/account`
- UserOp batching capabilities

**Verification:**
- BSCScan API for contract verification
- API key required: `BSCSCAN_API_KEY`

### Database

**Future Integration (Drizzle ORM):**
- Package.json includes Drizzle scripts (`db:push`, `db:push:force`)
- Not currently implemented in codebase
- Likely for caching API responses or reputation data

### Security Considerations

**Private Key Management:**
- Environment variable: `PRIVATE_KEY`
- Automatic 0x prefix handling in hardhat.config.js
- Never committed to repository (.env in .gitignore)

**Multi-Wallet Security:**
- Worker wallets generated deterministically from master
- Automatic funding from master wallet
- Balance monitoring scripts included

**Smart Contract Security:**
- ReentrancyGuard on all payment functions
- Ownable pattern for admin functions
- Fee validation (1% max platform fee enforced)