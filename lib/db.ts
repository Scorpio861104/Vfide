// Database Client - Real PostgreSQL Connection
// NO MOCKS - Real database queries

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logger } from './logger';

// Lazy initialization to avoid build-time errors
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    // Validate DATABASE_URL is set in production (at runtime, not build time)
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is required in production. ' +
        'Please set it in your environment configuration.'
      );
    }

    _pool = new Pool({
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
    _pool.on('connect', () => {
      logger.info('Database connected');
    });

    _pool.on('error', (err) => {
      logger.error('Database connection error', err);
      if (err.message.includes('Connection terminated') || err.message.includes('ECONNREFUSED')) {
        logger.warn('Database connection lost. Pool will attempt to reconnect automatically.');
      }
    });
  }
  return _pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string, 
  params?: (string | number | boolean | null | Date | undefined | unknown[])[]
): Promise<QueryResult<T>> {
  const pool = getPool();
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
  return await getPool().connect();
}

// Export pool getter for compatibility
export function pool() {
  return getPool();
}

// Helper function to safely close the pool
export async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info('Database pool closed');
  }
}
