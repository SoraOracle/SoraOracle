# S402 Scan Frontend

The analytics dashboard for S402 oracle payments on BNB Chain.

## Features

- **Analytics Dashboard**: Real-time volume, transactions, and provider stats
- **Transaction Explorer**: Search and filter S402 payments
- **Data Source Marketplace**: Discover oracle APIs (CoinGecko, OpenWeather, etc.)
- **Agent Composer** (Coming soon): No-code oracle bot builder
- **Provider Leaderboard**: Top oracle providers by volume

## Tech Stack

- **Next.js 15** - React framework
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Ethers.js** - Blockchain interaction
- **React Query** - Data fetching

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

Create `.env.local`:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org
NEXT_PUBLIC_S402_FACILITATOR=0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3
```

## Pages

- `/` - Analytics dashboard
- `/transactions` - Transaction explorer
- `/providers` - Provider leaderboard
- `/data-sources` - Data source marketplace
- `/composer` - AI Agent Composer (WIP)
- `/tx/[hash]` - Transaction details
- `/provider/[address]` - Provider profile

## API Routes

- `/api/stats` - Overview statistics
- `/api/payments` - List of payments (paginated)
- `/api/providers` - Provider list with stats
- `/api/data-sources` - Data source directory
- `/api/daily-stats` - Daily aggregated metrics
