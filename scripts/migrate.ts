#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Reads .sql files from /migrations in timestamp order, tracks applied
 * migrations in a `schema_migrations` table, and applies new ones inside
 * a transaction so a failed migration can be rolled back atomically.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts            # apply pending migrations
 *   npx tsx scripts/migrate.ts --status   # show applied + pending
 *   npx tsx scripts/migrate.ts --dry-run  # show what would run
 */

import { Pool } from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  return new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  });
}

/** Return migration files sorted by timestamp prefix. */
function getMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const res = await pool.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return new Set(res.rows.map((r) => r.version));
}

async function showStatus(pool: Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);
  const files = getMigrationFiles();

  console.log('\nMigration Status');
  console.log('================');
  for (const f of files) {
    const version = basename(f, '.sql');
    const status = applied.has(version) ? '✓ applied' : '  pending';
    console.log(`  ${status}  ${f}`);
  }
  console.log(`\nTotal: ${files.length} files, ${applied.size} applied, ${files.length - applied.size} pending\n`);
}

async function runMigrations(pool: Pool, dryRun: boolean): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);
  const files = getMigrationFiles();
  const pending = files.filter((f) => !applied.has(basename(f, '.sql')));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}${pending.length} pending migration(s):\n`);

  for (const f of pending) {
    const version = basename(f, '.sql');
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8');

    if (dryRun) {
      console.log(`  Would apply: ${f}`);
      continue;
    }

    console.log(`  Applying: ${f} ...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [version]
      );
      await client.query('COMMIT');
      console.log(`  ✓ ${f}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${f} — rolling back`);
      throw err;
    } finally {
      client.release();
    }
  }

  if (!dryRun) {
    console.log(`\nAll ${pending.length} migration(s) applied successfully.\n`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pool = getPool();

  try {
    if (args.includes('--status')) {
      await showStatus(pool);
    } else {
      await runMigrations(pool, args.includes('--dry-run'));
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
