/**
 * Migration: Add sessions table for time-limited spending sessions
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  try {
    console.log('📦 Creating s402_sessions table...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS s402_sessions (
        id VARCHAR(66) PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        session_address VARCHAR(42) NOT NULL,
        session_private_key TEXT NOT NULL,
        max_usd1_amount NUMERIC(20, 6) NOT NULL,
        spent_amount NUMERIC(20, 6) DEFAULT 0,
        duration_seconds INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('📊 Creating indexes...');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_session_user ON s402_sessions(user_address);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_session_active ON s402_sessions(is_active, expires_at) WHERE is_active = TRUE;
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_session_address ON s402_sessions(session_address);
    `);

    console.log('✅ Sessions table created successfully!');
    
    // Verify table exists
    const result = await db.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 's402_sessions'
    `);
    
    console.log(`✓ Table exists: ${result.rows[0].count > 0}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.end();
  }
}

migrate();
