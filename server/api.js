const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// S402 Oracle Routes (micropayment-protected endpoints)
try {
  const s402OracleRouter = require('./s402-oracle');
  app.use('/api/s402', s402OracleRouter);
  console.log('✅ S402 Oracle routes enabled');
} catch (error) {
  console.warn('⚠️  S402 Oracle routes not available:', error.message);
}

app.get('/api/markets', async (req, res) => {
  try {
    const { resolved, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM markets';
    const params = [];
    
    if (resolved !== undefined) {
      query += ' WHERE is_resolved = $1';
      params.push(resolved === 'true');
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/markets/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;
    const result = await db.query(
      'SELECT * FROM markets WHERE market_id = $1',
      [marketId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/markets/:marketId/history', async (req, res) => {
  try {
    const { marketId } = req.params;
    const result = await db.query(
      `SELECT timestamp, yes_probability, no_probability, yes_volume, no_volume
       FROM market_snapshots
       WHERE market_id = $1
       ORDER BY timestamp ASC`,
      [marketId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching market history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/markets/:marketId/bets', async (req, res) => {
  try {
    const { marketId } = req.params;
    const result = await db.query(
      `SELECT * FROM bets
       WHERE market_id = $1
       ORDER BY timestamp DESC`,
      [marketId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:address/bets', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await db.query(
      `SELECT b.*, m.question, m.deadline, m.is_resolved, m.resolution_answer
       FROM bets b
       JOIN markets m ON b.market_id = m.market_id
       WHERE b.user_address = $1
       ORDER BY b.timestamp DESC`,
      [address.toLowerCase()]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user bets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:address/claims', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await db.query(
      `SELECT c.*, m.question
       FROM claims c
       JOIN markets m ON c.market_id = m.market_id
       WHERE c.user_address = $1
       ORDER BY c.timestamp DESC`,
      [address.toLowerCase()]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user claims:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/overview', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(DISTINCT market_id) as total_markets,
        COUNT(DISTINCT CASE WHEN is_resolved THEN market_id END) as resolved_markets,
        (SELECT COUNT(DISTINCT user_address) FROM bets) as total_users,
        (SELECT SUM(amount::numeric) FROM bets) as total_volume,
        (SELECT COUNT(*) FROM bets) as total_bets,
        (SELECT COUNT(*) FROM claims) as total_claims
      FROM markets
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/daily-volume', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const parsedDays = parseInt(days);
    
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }
    
    const result = await db.query(`
      SELECT
        DATE(timestamp) as date,
        SUM(amount::numeric) as volume,
        COUNT(*) as bet_count
      FROM bets
      WHERE timestamp > NOW() - INTERVAL '${parsedDays} days'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily volume:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 3) {
      return res.json([]);
    }
    
    const result = await db.query(
      `SELECT market_id, question, deadline, is_resolved, created_at
       FROM markets
       WHERE question ILIKE $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${q}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching markets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
