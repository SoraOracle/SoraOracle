const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
-- Tools table: API endpoints that agents can call via 402 payments
CREATE TABLE IF NOT EXISTS s402_tools (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  endpoint_url VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) DEFAULT 'GET',
  auth_headers JSONB DEFAULT '{}',
  input_schema JSONB NOT NULL,
  cost_usd NUMERIC(10, 6) NOT NULL,
  provider_address VARCHAR(42) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_category ON s402_tools(category);
CREATE INDEX IF NOT EXISTS idx_tool_active ON s402_tools(is_active);

-- Agent chat history table
CREATE TABLE IF NOT EXISTS s402_agent_chats (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(66) NOT NULL REFERENCES s402_agents(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_agent ON s402_agent_chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON s402_agent_chats(created_at);

-- Admin wallets table
CREATE TABLE IF NOT EXISTS s402_admin_wallets (
  address VARCHAR(42) PRIMARY KEY,
  name VARCHAR(255),
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tool usage payments table
CREATE TABLE IF NOT EXISTS s402_tool_payments (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(66) NOT NULL REFERENCES s402_agents(id) ON DELETE CASCADE,
  tool_id VARCHAR(50) NOT NULL REFERENCES s402_tools(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66) NOT NULL,
  payer_address VARCHAR(42) NOT NULL,
  amount_usd NUMERIC(10, 6) NOT NULL,
  tool_input JSONB,
  tool_output JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tool_payment_agent ON s402_tool_payments(agent_id);
CREATE INDEX IF NOT EXISTS idx_tool_payment_tx ON s402_tool_payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tool_payment_status ON s402_tool_payments(status);

-- Insert initial admin wallet
INSERT INTO s402_admin_wallets (address, name, added_by)
VALUES 
  ('0x0000000000000000000000000000000000000000', 'System Admin', '0x0000000000000000000000000000000000000000')
ON CONFLICT (address) DO NOTHING;
`;

async function migrate() {
  try {
    console.log('Running Composer schema migration...');
    await pool.query(sql);
    console.log('✅ Migration successful!');
    console.log('Created tables: s402_tools, s402_agent_chats, s402_admin_wallets, s402_tool_payments');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
