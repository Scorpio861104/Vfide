/**
 * Database Migration System
 * 
 * Provides a simple, robust migration system for PostgreSQL database schema evolution.
 * Tracks migrations using a dedicated migrations table and supports rollback.
 * 
 * Features:
 * - Automatic migration tracking
 * - Rollback support
 * - Transaction safety
 * - Idempotent operations
 * - Migration validation
 * 
 * Usage:
 *   npm run migrate:up    - Run pending migrations
 *   npm run migrate:down  - Rollback last migration
 *   npm run migrate:status - Show migration status
 *   npm run migrate:create name - Create new migration
 */

import { Pool, PoolClient } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export interface Migration {
  id: number;
  name: string;
  filename: string;
  applied_at: Date | null;
  up: string;
  down: string;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  applied_at: Date | null;
}

export function requiresNonTransactionalExecution(sql: string): boolean {
  const pattern = /\bindex\s+concurrently\b|\breindex\b[\s\S]*\bconcurrently\b|\bvacuum\b|\bcluster\b/i;
  return pattern.test(sql);
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += char;
      if (char === '\n') inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += '/';
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (dollarTag) {
      current += char;
      if (sql.startsWith(dollarTag, i)) {
        current += sql.slice(i + 1, i + dollarTag.length);
        i += dollarTag.length;
        dollarTag = null;
      } else {
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && char === '-' && next === '-') {
      current += '--';
      inLineComment = true;
      i += 2;
      continue;
    }

    if (!inSingle && !inDouble && char === '/' && next === '*') {
      current += '/*';
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (!inSingle && !inDouble && char === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (!inDouble && char === '\'') {
      inSingle = !inSingle;
      current += char;
      i += 1;
      continue;
    }

    if (!inSingle && char === '"') {
      inDouble = !inDouble;
      current += char;
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble && char === ';') {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/**
 * Ensure migrations tracking table exists
 */
export async function ensureMigrationsTable(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_name 
        ON schema_migrations(name);
    `);
    console.log('✅ Migrations table ready');
  } finally {
    client.release();
  }
}

/**
 * Get all migration files from migrations directory
 */
export async function getMigrationFiles(migrationsDir: string): Promise<string[]> {
  try {
    const files = await readdir(migrationsDir);
    return files
      .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort(); // Chronological order (YYYYMMDD_HHMMSS_name.sql)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn('⚠️ Migrations directory not found, creating it...');
      return [];
    }
    throw error;
  }
}

/**
 * Parse migration file to extract up and down SQL
 */
export async function parseMigrationFile(
  migrationsDir: string,
  filename: string
): Promise<{ up: string; down: string }> {
  const upPath = join(migrationsDir, filename);
  const downFilename = filename.replace('.sql', '.down.sql');
  const downPath = join(migrationsDir, downFilename);

  try {
    const upSql = await readFile(upPath, 'utf-8');
    let downSql = '';

    try {
      downSql = await readFile(downPath, 'utf-8');
    } catch (_error) {
      console.warn(`⚠️ No rollback file found for ${filename}`);
    }

    return { up: upSql, down: downSql };
  } catch (error) {
    throw new Error(`Failed to read migration file ${filename}: ${error}`);
  }
}

/**
 * Get list of applied migrations from database
 */
export async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY applied_at'
    );
    return new Set(result.rows.map(r => r.name));
  } finally {
    client.release();
  }
}

/**
 * Get migration status for all migrations
 */
export async function getMigrationStatus(
  migrationsDir: string,
  pool: Pool
): Promise<MigrationStatus[]> {
  await ensureMigrationsTable(pool);
  const files = await getMigrationFiles(migrationsDir);
  const applied = await getAppliedMigrations(pool);

  const client = await pool.connect();
  try {
    const status: MigrationStatus[] = [];

    for (const file of files) {
      const name = file.replace('.sql', '');
      const isApplied = applied.has(name);

      let applied_at = null;
      if (isApplied) {
        const result = await client.query<{ applied_at: Date }>(
          'SELECT applied_at FROM schema_migrations WHERE name = $1',
          [name]
        );
        applied_at = result.rows[0]?.applied_at || null;
      }

      status.push({
        name,
        applied: isApplied,
        applied_at,
      });
    }

    return status;
  } finally {
    client.release();
  }
}

/**
 * Apply a single migration
 */
export async function applyMigration(
  client: PoolClient,
  name: string,
  sql: string
): Promise<void> {
  if (requiresNonTransactionalExecution(sql)) {
    try {
      // Some PostgreSQL operations (for example CREATE INDEX CONCURRENTLY) are forbidden inside transactions.
      const statements = splitSqlStatements(sql);
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query(
        'INSERT INTO schema_migrations (name, applied_at) VALUES ($1, NOW())',
        [name]
      );
      console.log(`✅ Applied migration: ${name} (non-transactional)`);
      return;
    } catch (error) {
      console.error(`❌ Failed to apply migration ${name}:`, error);
      throw error;
    }
  }

  try {
    await client.query('BEGIN');

    // Execute migration SQL
    await client.query(sql);

    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (name, applied_at) VALUES ($1, NOW())',
      [name]
    );

    await client.query('COMMIT');
    console.log(`✅ Applied migration: ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to apply migration ${name}:`, error);
    throw error;
  }
}

/**
 * Rollback a single migration
 */
export async function rollbackMigration(
  client: PoolClient,
  name: string,
  sql: string
): Promise<void> {
  if (!sql || sql.trim().length === 0) {
    throw new Error(`No rollback SQL provided for migration ${name}`);
  }

  if (requiresNonTransactionalExecution(sql)) {
    try {
      // Mirror apply behavior for rollback scripts that include non-transactional SQL.
      const statements = splitSqlStatements(sql);
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query(
        'DELETE FROM schema_migrations WHERE name = $1',
        [name]
      );
      console.log(`✅ Rolled back migration: ${name} (non-transactional)`);
      return;
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${name}:`, error);
      throw error;
    }
  }

  try {
    await client.query('BEGIN');

    // Execute rollback SQL
    await client.query(sql);

    // Remove migration record
    await client.query(
      'DELETE FROM schema_migrations WHERE name = $1',
      [name]
    );

    await client.query('COMMIT');
    console.log(`✅ Rolled back migration: ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to rollback migration ${name}:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function migrateUp(
  migrationsDir: string,
  pool: Pool
): Promise<number> {
  await ensureMigrationsTable(pool);

  const files = await getMigrationFiles(migrationsDir);
  const applied = await getAppliedMigrations(pool);
  const pending = files.filter(f => !applied.has(f.replace('.sql', '')));

  if (pending.length === 0) {
    console.log('✅ No pending migrations');
    return 0;
  }

  console.log(`📦 Found ${pending.length} pending migration(s)`);

  const client = await pool.connect();
  try {
    for (const file of pending) {
      const name = file.replace('.sql', '');
      const { up } = await parseMigrationFile(migrationsDir, file);
      await applyMigration(client, name, up);
    }

    console.log(`✅ Successfully applied ${pending.length} migration(s)`);
    return pending.length;
  } finally {
    client.release();
  }
}

/**
 * Rollback the last N migrations
 */
export async function migrateDown(
  migrationsDir: string,
  pool: Pool,
  count: number = 1
): Promise<number> {
  await ensureMigrationsTable(pool);

  const client = await pool.connect();
  try {
    // Get last N applied migrations
    const result = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY applied_at DESC LIMIT $1',
      [count]
    );

    if (result.rows.length === 0) {
      console.log('✅ No migrations to rollback');
      return 0;
    }

    console.log(`📦 Rolling back ${result.rows.length} migration(s)`);

    for (const row of result.rows) {
      const filename = `${row.name}.sql`;
      const { down } = await parseMigrationFile(migrationsDir, filename);
      await rollbackMigration(client, row.name, down);
    }

    console.log(`✅ Successfully rolled back ${result.rows.length} migration(s)`);
    return result.rows.length;
  } finally {
    client.release();
  }
}

/**
 * Validate migration file naming convention
 */
export function validateMigrationName(filename: string): boolean {
  // Expected format: YYYYMMDD_HHMMSS_description.sql
  const pattern = /^\d{8}_\d{6}_[a-z0-9_]+\.sql$/;
  return pattern.test(filename);
}

/**
 * Generate migration filename with timestamp
 */
export function generateMigrationFilename(description: string): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '_')
    .slice(0, 15); // YYYYMMDD_HHMMSS

  const sanitized = description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${timestamp}_${sanitized}.sql`;
}
