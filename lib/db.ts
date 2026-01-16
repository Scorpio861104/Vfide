// Database Client - Real PostgreSQL Connection
// Enhanced with connection pooling, health checks, and retry logic

import { Pool, QueryResult, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vfide_testnet',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Database connected');
  }
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

/**
 * Execute a parameterized query with optional retry logic
 * @param text - SQL query string
 * @param params - Query parameters
 * @param retries - Number of retries on connection failure (default: 2)
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string, 
  params?: unknown[],
  retries = 2
): Promise<QueryResult<T>> {
  const start = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      // Only log in development to avoid noise in production
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      lastError = error as Error;
      
      // Only retry on connection errors, not query errors
      const isConnectionError = lastError.message?.includes('connection') || 
                                 lastError.message?.includes('ECONNREFUSED');
      
      if (!isConnectionError || attempt >= retries) {
        console.error('Database query error:', error);
        throw error;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

export async function getClient() {
  return await pool.connect();
}

/**
 * Health check for database connectivity
 * @returns true if database is reachable
 */
export async function isHealthy(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export { pool };

// Helper function to safely close the pool
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}
