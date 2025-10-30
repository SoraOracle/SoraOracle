# Sora Oracle SDK

## Overview

Sora Oracle is a permissionless oracle SDK for prediction markets on BNB Chain, enabling trustless data feeds through AI-powered API discovery, cryptographic verification, and HTTP 402 micropayments using USD1 stablecoin. The platform supports various market types, including binary outcomes, multi-outcome markets, AMMs, and orderbooks, with automated settlement via AI research agents. It includes TypeScript/JavaScript bindings for React applications and a complete smart contract suite deployed on BNB Chain mainnet. The system utilizes EIP-2612 permit signatures for gasless USD1 payments and supports parallel transaction processing. A key component is "Composer," an AI agent builder integrated with Claude and 402 payments, allowing users to create agents that interact with external APIs, with payment prompts for tool usage. The project aims for significant adoption, targeting 100K oracle queries/day, 1,000 active AI agents, and $100K monthly volume within its first year.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Smart Contract Layer

The core system revolves around several key smart contracts on BNB Chain. The **SoraOracle.sol** contract manages question submission, answer provision with confidence scoring, oracle provider rewards, and supports TWAP oracle integration. The **S402PaymentFacilitator.sol** (current v3 at `0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3`) handles allowance-based USD1 transfers, legacy EIP-2612 permit support (with a workaround for USD1 permit issues), and platform fee collection. Prediction market contracts include `SimplePredictionMarket`, `MultiOutcomeMarket`, `BatchPayoutDistributor`, `MarketFactory`, and `AutomatedMarketResolver`. Advanced features include `BatchOracleOperations`, `OracleReputationTracker`, `DisputeResolution`, and `ReferralRewards`.

### AI Research & Settlement

A **Self-Expanding Research Agent** dynamically discovers APIs through services like RapidAPI and APIs.guru, routes data based on categories, applies statistical consensus, and automatically registers new APIs. **Market Quality Evaluation** scores questions for verifiability and clarity, with automated approval/rejection thresholds and manual review for borderline cases. **Settlement** integrates OpenAI GPT-4 for outcome verification, aggregates multi-source data, stores research proofs on IPFS, and performs TLS certificate verification for data authenticity.

### Multi-Wallet Parallelization

To overcome the limitation of sequential nonces in EIP-2612, a multi-wallet worker pool is implemented. A master wallet funds 10 worker wallets with USD1, enabling parallel S402 payment processing for a 10x speedup. The system monitors and refunds worker balances, using a round-robin selection for operations.

### Frontend Architecture

The frontend is built with **React 18, TypeScript, and Vite**. It uses **React Router** for navigation and **Ethers.js v6** for blockchain interaction. The `@sora-oracle/sdk` provides React hooks and TypeScript client classes for market data and wallet connection. A **1inch Embedded Widget** is integrated for direct USD1 token swaps, featuring a dark theme consistent with the S402 design.

### Payment Gateway (S402 Tool Proxy)

An **Express.js server** on port 3001 acts as a unified payment gateway for all AI agent tools, accepting S402 payments and proxying requests to external APIs. The system includes **11 production tools** with payment protection:

**Media Generation** ($0.05):
- 🎨 Seedream 4 Image Generator - AI image generation with custom prompts and aspect ratios

**Free Public API Tools** ($0.01-$0.02):
- 🌍 Country Information Lookup - Detailed country data (capital, population, languages, currencies)
- 😂 Random Joke Generator - Safe-mode jokes across multiple categories
- 🐕 Random Dog Image - Random dog photos, optionally filtered by breed
- 🐱 Random Cat Fact - Interesting cat facts
- 🍺 Brewery Finder - Search breweries worldwide by city and type
- 🚀 NASA Astronomy Picture - NASA's daily astronomy picture with explanations
- 👤 Random User Generator - Realistic user profiles for testing
- 💡 Random Advice - Inspirational advice slips
- 🎯 Activity Suggestions - Boredom-busting activity ideas filtered by type/participants
- ✨ Inspirational Quote - Random quotes from famous authors

All tools use unified payment verification (sender check, recipient check, amount check, replay prevention, time validity) and are managed through the `s402_tools` database table with `icon_url` field for stock photo images. Each tool displays professional stock photography in the marketplace UI. Transaction history links payments to specific tools via the `s402_proxy_usage` table, showing which tool was used for each payment with its corresponding icon and metadata.

### S402 Scan - Oracle Ecosystem Explorer

A complete rebuild of x402scan for BNB Chain oracles serves as an analytics dashboard and ecosystem platform. It comprises an **Indexer Service** that monitors `PaymentSettled` events from the `S402Facilitator` contract, polling BSC and storing data in PostgreSQL. The **Frontend Dashboard** uses Next.js 15 with dual light/dark theme system (soft gray #F5F5F7 backgrounds in light mode, transparent borders in dark mode) and Press Start 2P pixel font, offering analytics charts, a transaction explorer, a data source marketplace, and an AI Agent Composer.

**Composer Features**: Users can create AI agents with public/private visibility controls, custom emoji icons, and tool selection. The platform includes a **Top Composers** leaderboard on the main dashboard, a dedicated `/composers` browse page with search functionality, and individual composer profile pages (`/composers/[address]`) showcasing their public agent portfolios. Privacy is enforced at the API level - only owners can view their private agents, while public agents are visible to everyone. Agents track query counts, data sources, and creation dates.

**Payment UX Improvements**: Agent tool payments use a polished confirmation flow - first-time payments show a modal with tool details and optional "don't show again" checkbox (preference stored in localStorage). Once enabled, payments process automatically with only transient status indicators ("Processing payment..." → "Payment complete") that appear briefly without polluting chat history. Status indicators use the same visual style as thinking/generating indicators, providing clean feedback while keeping conversation focused on actual responses.

**Session-Based Zero-Signature Payments**: The platform implements a session wallet system for seamless agent interactions. Users create a session by transferring USD1 (up to their spending limit) and BNB (for gas, dynamically calculated based on USD1 amount) to a session wallet generated server-side with AES-256 encrypted private keys. Gas calculation formula: `BNB = min((USD1 / 0.02) * 0.0000075, 0.00375)` for up to 10 USD1 maximum. This one-time setup (2 signatures: USD1 transfer + BNB transfer) enables zero-signature tool usage - the session wallet autonomously signs S402 payments for tools. Sessions persist indefinitely until manually closed by the user - no automatic expiry. 

**Session Refunds & History**: Refunds use the same S402 Facilitator system as payments for consistency and tracking. When closing a session, USD1 refunds are processed through `S402Facilitator.settlePayment()` with proper EIP-712 signatures (not direct transfers), ensuring all transactions appear in the ecosystem analytics. BNB refunds attempt to return gas with conservative calculations, but sessions can close successfully with small BNB dust remaining (< 0.0002 BNB) if refund transactions fail. Refund thresholds: 0.01 USD1 (must refund), 0.0002 BNB (dust acceptable). A dedicated `/sessions/history` page displays all past sessions with real-time on-chain balance checks, allowing users to manually refund leftover funds from sessions that still hold USD1 or BNB. **Critical: Encrypted private keys are NEVER deleted**, even after successful refunds - empty wallets pose no security risk, and retaining keys allows for dust recovery and transaction history access. Server-side JWT authentication and spending tracking prevent abuse, with sessions stored in the `s402_sessions` database table.

### Database Layer

The project primarily uses **PostgreSQL** for data storage. The core application leverages **Drizzle ORM**, while the S402 Scan component uses raw SQL. The schema includes tables for market metadata, user bets, oracle question/answer history, worker wallet logs, API discovery cache, and specific tables for S402 Scan analytics (payments, providers, data sources, agents, daily stats, indexer state). The `s402_agents` table includes `is_public` (boolean, default TRUE) and `icon` (varchar, default '🤖') fields for agent visibility control and customization.

## External Dependencies

### Blockchain Infrastructure

- **BNB Chain (BSC)**: Mainnet (Chain ID: 56) and Testnet (Chain ID: 97) with public RPC endpoints and BNB as the gas token.
- **Smart Contract Deployments**: `S402Facilitator` mainnet deployment at `0x75c8CCD195F7B5Fb288B107B45FaF9a1289d7Df1`.
- **Token Standards**: ERC-20 USD1 (World Liberty Financial) at `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` (18 decimals) with full EIP-2612 support.

### DeFi Integrations

- **PancakeSwap V2**: Utilized for TWAP oracles (BNB/BUSD, BNB/USDT, CAKE/BNB pairs) with 5-minute update intervals.

### AI Services

- **OpenAI API**: Specifically GPT-4o, used for market quality evaluation, outcome verification, and API discovery with a low temperature (0.1) for deterministic responses and JSON mode for structured outputs.
- **API Discovery Services**: RapidAPI and APIs.guru for discovering and browsing public APIs.

### Data Storage

- **IPFS**: For immutable storage of research proofs and settlement data, with Pinata for production and local mock for development.
- **TLS Verification**: For authenticating data sources via real HTTPS certificate checks.

### Development Tools

- **Hardhat**: Ethereum development environment for Solidity 0.8.20, contract deployment, and verification.
- **TypeScript/Node.js**: For SDK and tooling, using tsup for compilation, Express for the gateway server, and dotenv for configuration.