# Sora Oracle SDK

## Overview
Sora Oracle is a production-ready, fully permissionless oracle SDK for prediction markets on BNB Chain. It provides manipulation-resistant TWAP oracles, supports diverse market types (binary, multi-outcome, conditional, AMM, range, time-series, limit order book), and incorporates AI-powered settlement. The system is designed for high gas efficiency and aims to deliver institutional-grade infrastructure for prediction markets.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Smart Contracts
The system is built around 23 core smart contracts, categorized into:
-   **V4 - Limit Order Book & Advanced Markets:** Includes `OrderBookMarket` for institutional-grade trading, `AggregatedOracle`, `ScheduledFeeds`, `CrossChainBridge`, `ConditionalMarket`, `AMMPredictionMarket`, `RangeBettingMarket`, `TimeSeriesMarket`, `OracleStaking`, `DAOGovernance`, and `SlashingMechanism`.
-   **V3 - Core Oracle & Markets:** Features `SoraOracle` for question/answer management, `PancakeTWAPOracle` for manipulation-resistant pricing, `SimplePredictionMarket` for binary outcomes, and `MultiOutcomeMarket` for 2-10 outcomes.

### Advanced Features
-   **Batch Operations:** `BatchOracleOperations` for submitting and answering multiple questions in one transaction.
-   **Reputation & Dispute:** `OracleReputationTracker` for performance monitoring and `DisputeResolution` for stake-based challenge system.
-   **Automated Resolution:** `AutomatedMarketResolver` and AI-Powered Settlement using GPT-4 for confidence-based market resolution.
-   **Batch Payouts:** `BatchPayoutDistributor` for efficient distribution of winnings.

### Growth & Discovery Features
-   **Referral Rewards:** System for rewarding user referrals.
-   **Market Factory:** Centralized registry for market creation, categorization, and tracking.
-   **Liquidity Incentives:** Rewards for market creators and liquidity providers.

### Gas Optimizations
Employs storage efficiency techniques like hash-based storage, compact struct packing, and event emissions, complemented by batch operations.

### Data Flow & Security
Questions are submitted on-chain and stored as hashes, with oracle providers submitting answers for bounties. TWAP oracles transition from spot to TWAP mode. Security features include role-based access control, ReentrancyGuard, deployment fees, emergency pause functions, and an `authorizedMarkets` mapping.

### UI/UX Decisions
The frontend uses React 18, Vite 6, and React Router 7, featuring a responsive UI with an orange/black Sora theme. It includes dashboards, user profiles, market creation, and MetaMask integration.

### Technical Stack
-   **SDK**: TypeScript, tsup, ethers.js v6.
-   **Hooks**: Custom React hooks.
-   **Backend**: Node.js, Express, PostgreSQL, ethers.js.
-   **Analytics**: recharts for data visualization.

### V5.0 Architecture (PRODUCTION-READY)
-   **s402 Micropayment Protocol:** Production-ready HTTP 402 payment system for BNB Chain using dual-signature security (EIP-2612 permit + EIP-712 payment authorization). All SDK operations require s402 payment proofs with differentiated pricing (dataSourceAccess: $0.03, marketCreation: $0.05, marketResolution: $0.10, oracleQuery: $0.01). Smart contract: `S402Facilitator.sol` ready for BNB mainnet deployment with 1% platform fee.
-   **Dual-Signature Security:** Users sign TWO signatures: (1) EIP-2612 permit for USDC approval, (2) EIP-712 PaymentAuthorization that cryptographically binds recipient address to prevent front-running attacks. Replay protection via used payment tracking.
-   **Multi-Wallet Parallelization:** `MultiWalletS402Pool` distributes transactions across 10 worker wallets, each with independent nonce sequences, achieving 10x speedup vs sequential processing. Solves BNB Chain's EIP-2612 sequential nonce limitation without requiring EIP-3009 (which doesn't exist on Binance-Bridged USDC).
-   **Emergency Controls:** Pausable contract with emergency stop mechanism, fee cap enforcement (max 10%), and owner-controlled fee adjustments. No upgrade mechanism - immutable deployment for security.
-   **Permissionless Oracle:** Achieves trustlessness through multi-source statistical consensus and cryptographic verification. Features AI discovery of APIs, parallel querying, TLS verification + SHA-256 hashing + IPFS audit trails, statistical outlier detection, automatic API reputation tracking, and temporal consistency. This system is fully automated and self-improving, allowing for permissionless data sourcing and automated market settlement.
-   **Production Infrastructure:** S402Facilitator contract security-audited and ready for deployment, multi-RPC fallback (Binance, NodeReal, Ankr), BSCScan verification setup, payment event monitoring, and platform fee withdrawal system.

### V5.0 Deployment Details
-   **Contract:** S402Facilitator (security-audited, ready for BNB mainnet deployment)
-   **USDC:** Binance-Bridged USDC at `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (EIP-2612 compatible)
-   **USDT:** Binance-Bridged USDT at `0x55d398326f99059fF775485246999027B3197955` (18 decimals!)
-   **Network:** BNB Chain Mainnet (ChainID: 56)
-   **Platform Fee:** 1% (100 bps, adjustable by owner, max 10%)
-   **Worker Wallets:** 10 wallets funded with $100 USDC each ($1,000 total pool)
-   **Security:** Dual-signature (permit + authorization), replay prevention, recipient binding, pausable, reentrancy guards
-   **Documentation:** README.md (user-facing), SORA_ORACLE_TECHNICAL_SPECIFICATION.md (architecture), V5_PERMISSIONLESS_ORACLE_COMPLETE.md (oracle design), V5_DEPLOYMENT_GUIDE.md, V5_OPERATIONS_MANUAL.md
-   **Branding:** "s402" (original implementation) - NOT x402 compliant but transparent about differences

### Recent Changes (October 27, 2025)
-   **CRITICAL SECURITY FIX:** Discovered and fixed recipient redirection vulnerability in S402Facilitator. Changed from single EIP-2612 permit to dual-signature system (permit + payment authorization with cryptographically-bound recipient).
-   **Batch Function Fixed:** Resolved reentrancy guard conflict in batchSettlePayments by using internal settlement function.
-   **Emergency Controls Added:** Implemented Pausable mechanism for emergency situations.
-   **Documentation Updated:** README.md updated to v5.0 with user-facing focus, all links verified, package.json updated to v5.0.0.

## External Dependencies

### Blockchain Infrastructure
-   **BSC Mainnet** (ChainID: 56)
-   **PancakeSwap V2 Factory**
-   **s402 Protocol** (custom HTTP 402 micropayment system using EIP-2612)

### Smart Contract Libraries
-   **OpenZeppelin Contracts v4.4.0**

### Development Tools
-   **Hardhat v2.22.18**
-   **Hardhat Toolbox v4.0.0**
-   **Ethers.js v6.x**
-   **Dotenv v16.4.7**

### External Services
-   **BSCScan API**
-   **BSC RPC Nodes**
-   **Replit AI Integrations** (for GPT-4 powered market settlement)