// Database Client - Real PostgreSQL Connection
// NO MOCKS - Real database queries

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { headers } from 'next/headers';
import { logger } from './logger';
import { extractToken, verifyToken } from './auth/jwt';
import { getAuthCookie } from './auth/cookieAuth';

// Lazy initialization to avoid build-time errors
let _pool: Pool | null = null;
const dbUserContext = new AsyncLocalStorage<{ userAddress: string | null }>();

export function setDbUserAddressContext(userAddress: string | null | undefined) {
  if (userAddress) {
    logger.warn('setDbUserAddressContext is deprecated; use runWithDbUserAddressContext instead');
  }
}

export function runWithDbUserAddressContext<T>(
  userAddress: string | null | undefined,
  operation: () => T,
): T {
  const normalized = userAddress ? userAddress.toLowerCase() : null;
  return dbUserContext.run({ userAddress: normalized }, operation);
}

async function applyDbUserAddressContext(client: PoolClient, userAddress: string | null) {
  if (!userAddress) return;
  await client.query("SELECT set_config('app.current_user_address', $1, true)", [userAddress]);
}

async function resolveRequestDbUserAddress(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const headerToken = extractToken(requestHeaders.get('authorization'))?.trim() ?? '';
    const cookieToken = (await getAuthCookie())?.trim() ?? '';
    const token = headerToken || cookieToken;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    return payload?.address?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function resolveActiveDbUserAddress(): Promise<string | null> {
  const store = dbUserContext.getStore();
  if (store) {
    return store.userAddress;
  }

  return resolveRequestDbUserAddress();
}

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
        // F-09 FIX: Require explicit ALLOW_DEV_DB=true opt-in for dev fallback.
        // Prevents staging/other non-prod envs (NODE_ENV != 'production') from silently using dev DB.
        (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_DB === 'true'
          ? 'postgresql://postgres:postgres@localhost:5432/vfide_testnet'
          : (() => { throw new Error(
              'DATABASE_URL is required. Set ALLOW_DEV_DB=true in development to use the local fallback.'
            ); })()
        ),
      max: Number.parseInt(process.env.DB_POOL_MAX || (process.env.NODE_ENV === 'production' ? '10' : '20'), 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000, // 30 second query timeout
      query_timeout: 30000, // 30 second query timeout (node-postgres)
      // Enable SSL in production; allow self-signed certs when CA is not provided.
      ...(process.env.NODE_ENV === 'production'
        ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } }
        : {}),
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
  const userAddress = await resolveActiveDbUserAddress();

  try {
    let res: QueryResult<T>;
    if (userAddress) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        try {
          await applyDbUserAddressContext(client, userAddress);
          res = await client.query<T>(text, params);
          await client.query('COMMIT');
        } finally {
          if ((client as unknown as { _ending?: boolean })._ending !== true) {
            // No-op path after COMMIT. Rollback is handled in catch.
          }
        }
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Ignore rollback errors and rethrow original failure.
        }
        throw error;
      } finally {
        client.release();
      }
    } else {
      res = await pool.query<T>(text, params);
    }

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

/**
 * F-32 FIX: Safer helper for dynamic WHERE clause composition.
 * Use '?' placeholder in each condition clause, this helper rewrites them to
 * positional '$n' parameters and executes a parameterized query.
 */
export async function safeQuery<T extends QueryResultRow = QueryResultRow>(
  baseQuery: string,
  conditions: Array<{ clause: string; param: unknown }>,
  suffix = ''
): Promise<QueryResult<T>> {
  const params: unknown[] = [];
  let fullQuery = baseQuery;

  for (const { clause, param } of conditions) {
    params.push(param);
    fullQuery += ` ${clause.replace('?', `$${params.length}`)}`;
  }

  if (suffix) {
    fullQuery += ` ${suffix}`;
  }

  return query<T>(fullQuery, params as (string | number | boolean | null | Date | undefined | unknown[])[]);
}

export async function getClient(): Promise<PoolClient> {
  const client = await getPool().connect();
  const userAddress = await resolveActiveDbUserAddress();

  if (userAddress) {
    const originalRelease = client.release.bind(client);
    const originalQuery = client.query.bind(client);
    let manualTransactionActive = false;

    client.query = (async (...args: Parameters<PoolClient['query']>) => {
      const firstArg = args[0];
      const sql = typeof firstArg === 'string' ? firstArg.trim().toUpperCase() : '';

      if (sql === 'BEGIN') {
        const result = await originalQuery(...args);
        await applyDbUserAddressContext(client, userAddress);
        manualTransactionActive = true;
        return result;
      }

      if (sql === 'COMMIT' || sql === 'ROLLBACK') {
        try {
          return await originalQuery(...args);
        } finally {
          manualTransactionActive = false;
        }
      }

      if (manualTransactionActive) {
        return originalQuery(...args);
      }

      await originalQuery('BEGIN');
      try {
        await applyDbUserAddressContext(client, userAddress);
        const result = await originalQuery(...args);
        await originalQuery('COMMIT');
        return result;
      } catch (error) {
        try {
          await originalQuery('ROLLBACK');
        } catch {
          // Ignore rollback errors and preserve the triggering error.
        }
        throw error;
      }
    }) as PoolClient['query'];

    client.release = ((err?: Error | boolean) => {
      client.query = originalQuery;
      originalRelease(err);
    }) as PoolClient['release'];
  }

  return client;
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
