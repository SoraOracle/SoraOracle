-- S402 Scan Database Schema
-- Tracks PaymentSettled events from S402Facilitator contract

-- Payments table: Individual s402 transactions
CREATE TABLE IF NOT EXISTS s402_payments (
  id BIGSERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  value NUMERIC(78, 0) NOT NULL, -- BigInt stored as numeric
  platform_fee NUMERIC(78, 0) NOT NULL,
  nonce BIGINT NOT NULL,
  value_usd NUMERIC(20, 6) NOT NULL,
  platform_fee_usd NUMERIC(20, 6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for s402_payments table
CREATE INDEX IF NOT EXISTS idx_from_address ON s402_payments(from_address);
CREATE INDEX IF NOT EXISTS idx_to_address ON s402_payments(to_address);
CREATE INDEX IF NOT EXISTS idx_block_number ON s402_payments(block_number);
CREATE INDEX IF NOT EXISTS idx_block_timestamp ON s402_payments(block_timestamp);

-- Providers table: Oracle data providers (aggregated)
CREATE TABLE IF NOT EXISTS s402_providers (
  address VARCHAR(42) PRIMARY KEY,
  name VARCHAR(255),
  category VARCHAR(50),
  description TEXT,
  website VARCHAR(500),
  total_received NUMERIC(78, 0) DEFAULT 0,
  total_received_usd NUMERIC(20, 6) DEFAULT 0,
  payment_count INT DEFAULT 0,
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  avg_payment_usd NUMERIC(20, 6) DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data sources table: API providers (CoinGecko, OpenWeather, etc.)
CREATE TABLE IF NOT EXISTS s402_data_sources (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  website VARCHAR(500),
  query_count INT DEFAULT 0,
  total_volume_usd NUMERIC(20, 6) DEFAULT 0,
  avg_cost_usd NUMERIC(10, 6) DEFAULT 0,
  reliability_score NUMERIC(5, 2) DEFAULT 0, -- 0-100
  avg_response_time_ms INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Agents table: Agents built with the Composer
CREATE TABLE IF NOT EXISTS s402_agents (
  id VARCHAR(66) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_address VARCHAR(42) NOT NULL,
  data_sources JSONB DEFAULT '[]', -- Array of data source IDs
  query_count INT DEFAULT 0,
  total_spent_usd NUMERIC(20, 6) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP
);

-- Indexes for s402_agents table
CREATE INDEX IF NOT EXISTS idx_owner_address ON s402_agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_is_active ON s402_agents(is_active);

-- Daily stats table: Aggregated metrics per day
CREATE TABLE IF NOT EXISTS s402_daily_stats (
  date DATE PRIMARY KEY,
  payment_count INT DEFAULT 0,
  volume_usd NUMERIC(20, 6) DEFAULT 0,
  platform_fees_usd NUMERIC(20, 6) DEFAULT 0,
  unique_payers INT DEFAULT 0,
  unique_providers INT DEFAULT 0,
  avg_payment_usd NUMERIC(20, 6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexer state table: Track last synced block
CREATE TABLE IF NOT EXISTS s402_indexer_state (
  id INT PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP,
  is_syncing BOOLEAN DEFAULT FALSE,
  CHECK (id = 1) -- Ensure only one row
);

-- Insert initial indexer state
INSERT INTO s402_indexer_state (id, last_synced_block)
VALUES (1, 44000000) -- Start block (S402Facilitator deployment)
ON CONFLICT (id) DO NOTHING;

-- Insert default data sources
INSERT INTO s402_data_sources (id, name, category, description, icon, website, avg_cost_usd)
VALUES
  ('coingecko', 'CoinGecko', 'crypto', 'Cryptocurrency price feeds', '📈', 'https://www.coingecko.com', 0.03),
  ('openweather', 'OpenWeather', 'weather', 'Weather data and forecasts', '🌤️', 'https://openweathermap.org', 0.02),
  ('newsapi', 'NewsAPI', 'news', 'News articles and event data', '📰', 'https://newsapi.org', 0.05),
  ('alphavantage', 'Alpha Vantage', 'finance', 'Stock market and financial data', '💹', 'https://www.alphavantage.co', 0.04),
  ('cryptocompare', 'CryptoCompare', 'crypto', 'Cryptocurrency market data', '💰', 'https://www.cryptocompare.com', 0.03)
ON CONFLICT (id) DO NOTHING;
