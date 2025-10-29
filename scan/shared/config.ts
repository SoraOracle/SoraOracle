/**
 * S402 Scan Configuration
 * Shared configuration for indexer and frontend
 */

export const S402_CONFIG = {
  // S402Facilitator contract address on BNB Chain mainnet
  FACILITATOR_ADDRESS: '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3',
  
  // USD1 (World Liberty Financial) token address
  USD1_ADDRESS: '0x8d0D000Ee44948FC98c9B77a845349DA3c48a3d',
  
  // Token decimals
  USD1_DECIMALS: 18,
  
  // BNB Chain configuration
  CHAIN_ID: 56,
  CHAIN_NAME: 'BNB Smart Chain',
  RPC_URL: 'https://bsc-dataseed.binance.org',
  EXPLORER_URL: 'https://bscscan.com',
  
  // BSCScan API (for fetching events)
  BSCSCAN_API_URL: 'https://api.bscscan.com/api',
  
  // Contract deployment block (for initial indexing)
  // S402Facilitator v3 was deployed around late 2024
  START_BLOCK: 44000000, // Adjust based on actual deployment block
  
  // Indexer configuration
  INDEXER: {
    POLL_INTERVAL: 60000, // Poll every 60 seconds
    BLOCKS_PER_BATCH: 5000, // Fetch 5000 blocks per batch
    CONFIRMATIONS: 12, // Wait for 12 confirmations
  },
  
  // Platform fee (1% = 100 basis points)
  PLATFORM_FEE_BPS: 100,
} as const;

/**
 * Known oracle data sources
 * These are the API providers that oracles query
 */
export const DATA_SOURCES = [
  {
    id: 'coingecko',
    name: 'CoinGecko',
    category: 'crypto',
    description: 'Cryptocurrency price feeds',
    icon: '📈',
    website: 'https://www.coingecko.com',
    avgCost: 0.03,
  },
  {
    id: 'openweather',
    name: 'OpenWeather',
    category: 'weather',
    description: 'Weather data and forecasts',
    icon: '🌤️',
    website: 'https://openweathermap.org',
    avgCost: 0.02,
  },
  {
    id: 'newsapi',
    name: 'NewsAPI',
    category: 'news',
    description: 'News articles and event data',
    icon: '📰',
    website: 'https://newsapi.org',
    avgCost: 0.05,
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    category: 'finance',
    description: 'Stock market and financial data',
    icon: '💹',
    website: 'https://www.alphavantage.co',
    avgCost: 0.04,
  },
  {
    id: 'cryptocompare',
    name: 'CryptoCompare',
    category: 'crypto',
    description: 'Cryptocurrency market data',
    icon: '💰',
    website: 'https://www.cryptocompare.com',
    avgCost: 0.03,
  },
] as const;

/**
 * Oracle provider categories
 */
export const PROVIDER_CATEGORIES = {
  PRICE_FEED: 'Price Feed Oracle',
  WEATHER: 'Weather Oracle',
  NEWS: 'News & Events Oracle',
  SPORTS: 'Sports Data Oracle',
  DEFI: 'DeFi Analytics Oracle',
  CUSTOM: 'Custom Oracle',
} as const;

export type DataSourceId = typeof DATA_SOURCES[number]['id'];
export type ProviderCategory = keyof typeof PROVIDER_CATEGORIES;
