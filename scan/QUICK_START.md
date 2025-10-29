# S402 Scan Quick Start

Get S402 Scan running locally in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Replit provides this automatically)
- BSCScan API key (optional, for faster indexing)

## Setup

### 1. Initialize Database

```bash
cd scan/indexer
psql $DATABASE_URL -f schema.sql
```

This creates all necessary tables for s402 payments, providers, data sources, etc.

### 2. Start the Indexer

The indexer monitors PaymentSettled events from the S402Facilitator contract and stores them in the database.

```bash
cd scan/indexer
npm install
npm start
```

The indexer will:
- Start syncing from block 44,000,000 (adjust in config if needed)
- Poll for new events every 60 seconds
- Store payments in PostgreSQL
- Update provider stats automatically

### 3. Start the Frontend

The dashboard displays analytics, transactions, and data sources.

```bash
cd scan/frontend
npm install
npm run dev
```

Visit `http://localhost:3001` to see the dashboard!

## Environment Variables

Create `.env` in the root directory:

```bash
# Database (provided by Replit)
DATABASE_URL=postgresql://...

# BSCScan API (optional - faster indexing)
BSCSCAN_API_KEY=your_key_here
```

## What Gets Tracked

S402 Scan indexes:

- **PaymentSettled Events**: All s402 micropayments on BNB Chain
- **Provider Stats**: Total received, payment count, avg payment
- **Daily Stats**: Volume, fees, unique users per day
- **Data Sources**: API query patterns (CoinGecko, OpenWeather, etc.)

## Initial Data

After starting the indexer, it will:

1. Sync historical PaymentSettled events from block 44M
2. Calculate provider statistics
3. Aggregate daily metrics
4. Update every 60 seconds

## Dashboard Features

- **📊 Analytics**: Total volume, payments, providers
- **🔍 Transactions**: Search and filter payments
- **🛠️ Data Sources**: Marketplace of oracle APIs
- **🤖 Agent Composer**: (Coming soon) No-code oracle bot builder

## Troubleshooting

### Indexer not finding events?

- Check S402Facilitator contract address is correct: `0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3`
- Verify START_BLOCK in indexer config matches contract deployment
- Make sure DATABASE_URL is set correctly

### Frontend showing 0 stats?

- Wait for indexer to sync historical events (may take 5-10 minutes)
- Check database has data: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM s402_payments;"`

### Database errors?

- Make sure you ran `schema.sql` to create tables
- Check DATABASE_URL is accessible from indexer

## Next Steps

- **Add custom data sources**: Edit `scan/shared/config.ts`
- **Deploy to production**: Both frontend and indexer can be deployed separately
- **Build agents**: Coming soon - Agent Composer UI

## Architecture

```
scan/
├── frontend/     # Next.js dashboard (port 3001)
├── indexer/      # Event indexer (background service)
└── shared/       # Shared config and types
```

## Support

- Documentation: [README.md](./README.md)
- GitHub: https://github.com/sora-oracle
- Issues: Report bugs via GitHub Issues
