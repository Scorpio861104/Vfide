// Database Client - Real PostgreSQL Connection
// NO MOCKS - Real database queries

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logger } from './logger';

// Validate DATABASE_URL is set in production
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required in production. ' +
    'Please set it in your environment configuration.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    (process.env.NODE_ENV === 'production' 
      ? undefined // Fail in production if not set
      : 'postgresql://postgres:postgres@localhost:5432/vfide_testnet'), // Dev fallback only
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000, // 30 second query timeout (node-postgres)
});

// Test connection on startup
pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Database connection error', err);
  // Log the error for monitoring, but let the pool handle reconnection
  // The pool will automatically attempt to reconnect
  if (err.message.includes('Connection terminated') || err.message.includes('ECONNREFUSED')) {
    logger.warn('Database connection lost. Pool will attempt to reconnect automatically.');
  }
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string, 
  params?: (string | number | boolean | null | Date | undefined | any[])[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    // Only log slow queries (>100ms) to reduce noise
    if (duration > 100) {
      logger.info('Slow query executed', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query error', error, { text: text.substring(0, 100), duration });
    
    // Re-throw with more context for better error handling
    if (error instanceof Error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    throw error;
  }
}

export async function getClient() {
  return await pool.connect();
}

export { pool };

// Helper function to safely close the pool
export async function closePool() {
  await pool.end();
  logger.info('Database pool closed');
}
