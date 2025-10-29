#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();

    console.log('📄 Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing schema...');
    await client.query(schema);

    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - s402_payments');
    console.log('  - s402_providers');
    console.log('  - s402_data_sources');
    console.log('  - s402_agents');
    console.log('  - s402_daily_stats');
    console.log('  - s402_indexer_state');
    console.log('');
    console.log('✨ Ready to start indexer with: npm start');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
