# S402 Scan

The complete oracle ecosystem explorer for BNB Chain - inspired by x402scan.com

## Architecture

S402 Scan is a monorepo containing three packages:

### 📊 `scan/frontend` - Next.js Dashboard
- Analytics dashboard (volume, transactions, providers)
- AI Agent Composer (no-code oracle bot builder)
- Data source marketplace (CoinGecko, OpenWeather, NewsAPI)
- Transaction explorer with search and filtering
- Real-time feed of oracle settlements

### 🔄 `scan/indexer` - Event Indexer Service
- Monitors `PaymentSettled` events from S402Facilitator contract
- Tracks oracle payments, providers, and data sources
- Stores transaction history in PostgreSQL
- Aggregates statistics (volume, fees, success rates)

### 🔧 `scan/shared` - Shared Configuration
- S402Facilitator contract ABI
- BNB Chain network configuration
- Data source registry
- Shared TypeScript types

## Key Differences from x402scan

| Feature | x402scan (Base) | S402 Scan (BSC) |
|---------|----------------|-----------------|
| **Protocol** | EIP-3009 (x402) | EIP-2612 (s402) |
| **Chains** | Base, Solana, Polygon | BNB Chain only |
| **Token** | Circle USDC | USD1 (World Liberty) |
| **Contract** | Multiple facilitators | Single S402Facilitator |
| **Event** | Transfer events | PaymentSettled events |
| **Focus** | General 402 payments | Oracle-specific payments |
| **Data Sources** | Firecrawl, Tavily, etc. | CoinGecko, OpenWeather, etc. |

## S402Facilitator Contract

- **Address**: `0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3` (BNB Chain mainnet)
- **Token**: USD1 at `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` (18 decimals)
- **Key Event**: `PaymentSettled(address indexed from, address indexed to, uint256 value, uint256 platformFee, uint256 nonce)`

## Quick Start

```bash
# Install dependencies
cd scan/frontend && npm install
cd scan/indexer && npm install

# Start indexer (monitors PaymentSettled events)
cd scan/indexer && npm run dev

# Start frontend (Next.js dashboard)
cd scan/frontend && npm run dev
```

## Database Schema

The indexer stores data in PostgreSQL:

- **s402_payments**: Individual payment records
- **s402_providers**: Oracle data providers (aggregated stats)
- **s402_data_sources**: API sources (CoinGecko, OpenWeather, etc.)
- **s402_agents**: AI agents built with the Composer
- **s402_daily_stats**: Daily aggregated metrics

## Features

### 🎯 Current (v1.0)
- [x] Real-time PaymentSettled event tracking
- [x] Analytics dashboard with charts
- [x] Transaction explorer with search
- [x] Top providers leaderboard
- [x] Data source marketplace
- [ ] AI Agent Composer (in progress)
- [ ] Embedded wallet for s402 payments

### 🚀 Planned (v2.0)
- [ ] WebSocket real-time feeds
- [ ] GraphQL API for developers
- [ ] Custom alerts (email/webhook)
- [ ] Provider reputation scoring
- [ ] Cross-chain oracle aggregation

## Vision

S402 Scan aims to become **the oracle chain infrastructure for BNB**:

**Year 1 Goals**:
- 100K oracle queries/day
- 1,000 active AI agents
- 500 registered data sources
- $100K monthly volume

**Year 2 Goals**:
- 500K queries/day
- 5,000 agents
- 2,000 data sources
- $500K monthly volume

x402scan proved this model works on Base (310K txns/day, $636K volume).
We're bringing it to BSC for oracles.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT - See [LICENSE](../LICENSE)
