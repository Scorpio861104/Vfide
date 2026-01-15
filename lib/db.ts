/**
 * Database Connection Pool Configuration
 * 
 * Real PostgreSQL connection with explicit pool configuration
 * for optimal performance and resource management.
 */

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vfide_testnet';

// Pool configuration with explicit settings
const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  
  // Maximum number of clients in the pool
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 20,
  
  // Minimum number of clients in the pool
  min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN) : 2,
  
  // Maximum time (ms) to wait for a connection
  connectionTimeoutMillis: process.env.DB_CONNECT_TIMEOUT 
    ? parseInt(process.env.DB_CONNECT_TIMEOUT) 
    : 5000,
  
  // Maximum time (ms) a client can remain idle before being closed
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT 
    ? parseInt(process.env.DB_IDLE_TIMEOUT) 
    : 30000,
  
  // Enable SSL in production
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
};

// Create pool instance
const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client', err);
  process.exit(-1);
});

// Log successful connections in development
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    console.log('✅ Database client connected');
  });

  pool.on('remove', () => {
    console.log('🔌 Database client removed from pool');
  });
}

// Query function with timing
export async function query<T extends QueryResultRow = any>(
  text: string, 
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { 
        text: text.substring(0, 100), 
        duration, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get a client from the pool
export async function getClient() {
  return await pool.connect();
}

// Export pool for direct use
export { pool };

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    return !!result.rows[0];
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Get pool statistics
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Helper function to safely close the pool
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}
