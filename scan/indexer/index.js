/**
 * S402 Scan Indexer
 * Monitors PaymentSettled events from S402Facilitator contract on BNB Chain
 */

require('dotenv').config({ path: '../../.env' });
const { ethers } = require('ethers');
const { Pool } = require('pg');
const https = require('https');

// Configuration
const CONFIG = {
  FACILITATOR_ADDRESS: '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3',
  USD1_DECIMALS: 18,
  CHAIN_ID: 56,
  RPC_URL: 'https://flashy-few-bush.bsc.quiknode.pro/c803d56e46396f5b5b45025ac3ecdee74488fea9/',
  BSCSCAN_API_URL: 'https://api.bscscan.com/api',
  BSCSCAN_API_KEY: process.env.BSCSCAN_API_KEY || '',
  START_BLOCK: 44000000, // S402Facilitator v3 deployment block
  POLL_INTERVAL: 60000, // 60 seconds
  BLOCKS_PER_BATCH: 500, // Smaller batches for RPC reliability
  CONFIRMATIONS: 12,
};

// S402Facilitator ABI (PaymentSettled event)
const S402_ABI = [
  'event PaymentSettled(address indexed from, address indexed to, uint256 value, uint256 platformFee, bytes32 nonce)',
  'function getStats(address account) view returns (uint256 totalPaid, uint256 totalReceived)',
];

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Ethereum provider
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const contract = new ethers.Contract(CONFIG.FACILITATOR_ADDRESS, S402_ABI, provider);

/**
 * Simple HTTPS GET request (replaces node-fetch for CJS compatibility)
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch events using BSCScan API (DEPRECATED - BSCScan API V1 no longer works)
 * Falling back to RPC for all queries
 */
async function fetchEventsBSCScan(fromBlock, toBlock) {
  // BSCScan API V1 is deprecated, use RPC only
  return fetchEventsRPC(fromBlock, toBlock);
}

/**
 * Fetch events using RPC (fallback)
 */
async function fetchEventsRPC(fromBlock, toBlock) {
  const filter = contract.filters.PaymentSettled();
  // Ensure blocks are numbers, not strings
  const from = typeof fromBlock === 'string' ? parseInt(fromBlock) : fromBlock;
  const to = typeof toBlock === 'string' ? parseInt(toBlock) : toBlock;
  const events = await contract.queryFilter(filter, from, to);

  const eventsWithTimestamp = await Promise.all(
    events.map(async (event) => {
      const block = await provider.getBlock(event.blockNumber);
      return {
        from: event.args.from,
        to: event.args.to,
        value: event.args.value,
        platformFee: event.args.platformFee,
        nonce: event.args.nonce,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        blockTimestamp: block.timestamp,
      };
    })
  );

  return eventsWithTimestamp;
}

/**
 * Convert BigInt to USD (assuming 1 USD1 = $1)
 */
function toUSD(value) {
  return parseFloat(ethers.formatUnits(value, CONFIG.USD1_DECIMALS));
}

/**
 * Store payment in database
 */
async function storePayment(event) {
  const valueUSD = toUSD(event.value);
  const platformFeeUSD = toUSD(event.platformFee);

  await db.query(
    `INSERT INTO s402_payments (
      tx_hash, block_number, block_timestamp, from_address, to_address,
      value, platform_fee, nonce, value_usd, platform_fee_usd
    ) VALUES ($1, $2, to_timestamp($3), $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (tx_hash) DO NOTHING`,
    [
      event.transactionHash,
      event.blockNumber,
      event.blockTimestamp,
      event.from,
      event.to,
      event.value.toString(),
      event.platformFee.toString(),
      event.nonce, // Store bytes32 as hex string
      valueUSD,
      platformFeeUSD,
    ]
  );

  console.log(`✅ Stored payment: ${event.from.slice(0, 8)}... → ${event.to.slice(0, 8)}... ($${valueUSD.toFixed(2)})`);
}

/**
 * Update provider stats
 */
async function updateProviderStats(address) {
  // Get on-chain stats
  const stats = await contract.getStats(address);
  const totalReceivedUSD = toUSD(stats.totalReceived);

  // Update database
  await db.query(
    `INSERT INTO s402_providers (
      address, total_received, total_received_usd, payment_count, first_seen_at, last_seen_at
    ) VALUES ($1, $2, $3, 1, NOW(), NOW())
    ON CONFLICT (address) DO UPDATE SET
      total_received = EXCLUDED.total_received,
      total_received_usd = EXCLUDED.total_received_usd,
      payment_count = s402_providers.payment_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW()`,
    [address, stats.totalReceived.toString(), totalReceivedUSD]
  );
}

/**
 * Update daily stats
 */
async function updateDailyStats(date) {
  await db.query(
    `INSERT INTO s402_daily_stats (date, payment_count, volume_usd, platform_fees_usd, unique_payers, unique_providers, avg_payment_usd)
    SELECT 
      DATE($1),
      COUNT(*),
      SUM(value_usd),
      SUM(platform_fee_usd),
      COUNT(DISTINCT from_address),
      COUNT(DISTINCT to_address),
      AVG(value_usd)
    FROM s402_payments
    WHERE DATE(block_timestamp) = DATE($1)
    ON CONFLICT (date) DO UPDATE SET
      payment_count = EXCLUDED.payment_count,
      volume_usd = EXCLUDED.volume_usd,
      platform_fees_usd = EXCLUDED.platform_fees_usd,
      unique_payers = EXCLUDED.unique_payers,
      unique_providers = EXCLUDED.unique_providers,
      avg_payment_usd = EXCLUDED.avg_payment_usd,
      updated_at = NOW()`,
    [date]
  );
}

/**
 * Main sync loop
 */
async function sync() {
  try {
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    const safeBlock = currentBlock - CONFIG.CONFIRMATIONS;

    // Get last synced block (auto-initialize if missing)
    const result = await db.query('SELECT last_synced_block FROM s402_indexer_state WHERE id = 1');
    let lastSyncedBlock;
    
    if (!result.rows[0]) {
      // Initialize state if missing
      await db.query(
        'INSERT INTO s402_indexer_state (id, last_synced_block) VALUES (1, $1)',
        [CONFIG.START_BLOCK]
      );
      lastSyncedBlock = CONFIG.START_BLOCK;
      console.log(`✨ Initialized indexer state at block ${CONFIG.START_BLOCK}`);
    } else {
      lastSyncedBlock = parseInt(result.rows[0].last_synced_block);
    }

    if (lastSyncedBlock >= safeBlock) {
      console.log(`📊 Already synced to block ${lastSyncedBlock} (current: ${currentBlock})`);
      return;
    }

    const fromBlock = lastSyncedBlock + 1;
    const toBlock = Math.min(fromBlock + CONFIG.BLOCKS_PER_BATCH - 1, safeBlock);

    console.log(`\n🔄 Syncing blocks ${fromBlock} → ${toBlock} (current: ${currentBlock})`);

    // Fetch events
    const events = await fetchEventsBSCScan(fromBlock, toBlock);

    console.log(`📥 Found ${events.length} PaymentSettled events`);

    // Process events
    const eventDates = new Set();
    for (const event of events) {
      await storePayment(event);
      await updateProviderStats(event.to);
      // Track unique dates for daily stats update
      const eventDate = new Date(event.blockTimestamp * 1000);
      eventDates.add(eventDate.toISOString().split('T')[0]);
    }

    // Update daily stats for each affected date
    for (const dateStr of eventDates) {
      await updateDailyStats(new Date(dateStr));
    }

    // Update indexer state
    await db.query(
      'UPDATE s402_indexer_state SET last_synced_block = $1, last_synced_at = NOW() WHERE id = 1',
      [toBlock]
    );

    console.log(`✅ Synced to block ${toBlock}\n`);
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

/**
 * Start indexer
 */
async function start() {
  console.log('🚀 S402 Scan Indexer starting...\n');
  console.log(`📡 Network: BNB Chain (ID: ${CONFIG.CHAIN_ID})`);
  console.log(`📝 Contract: ${CONFIG.FACILITATOR_ADDRESS}`);
  console.log(`🔄 Poll interval: ${CONFIG.POLL_INTERVAL / 1000}s\n`);

  // Initial sync
  await sync();

  // Poll for new blocks
  setInterval(sync, CONFIG.POLL_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down indexer...');
  await db.end();
  process.exit(0);
});

// Start indexer
start().catch(console.error);
