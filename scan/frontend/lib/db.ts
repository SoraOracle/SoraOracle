/**
 * Shared PostgreSQL connection pool for API routes
 * Prevents connection exhaustion in serverless environments
 */

import { Pool } from 'pg';

declare global {
  var _pgPool: Pool | undefined;
}

// Use singleton pattern to reuse connection pool
export const db = global._pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Limit concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = db;
}
