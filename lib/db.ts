// Database Client - Real PostgreSQL Connection
// NO MOCKS - Real database queries

import { Pool, QueryResult, QueryResultRow } from 'pg';

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
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  // Log the error for monitoring, but let the pool handle reconnection
  // The pool will automatically attempt to reconnect
  if (err.message.includes('Connection terminated') || err.message.includes('ECONNREFUSED')) {
    console.error('⚠️ Database connection lost. Pool will attempt to reconnect automatically.');
  }
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Database query error:', { error, text, duration });
    
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
  console.log('Database pool closed');
}
