#!/usr/bin/env node
/**
 * Migration CLI Tool
 * 
 * Command-line interface for database migrations.
 * 
 * Commands:
 *   up            - Apply all pending migrations
 *   down [count]  - Rollback last N migrations (default: 1)
 *   status        - Show migration status
 *   create <name> - Create a new migration file
 */

import { Pool } from 'pg';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  migrateUp,
  migrateDown,
  getMigrationStatus,
  generateMigrationFilename,
} from './index';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function getPool(): Promise<Pool> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is required. ' +
      'Please set it in your .env.local file.'
    );
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

async function runUp(): Promise<void> {
  const pool = await getPool();
  try {
    const count = await migrateUp(MIGRATIONS_DIR, pool);
    console.log(`\n✅ Migration complete. Applied ${count} migration(s).`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runDown(count: number = 1): Promise<void> {
  const pool = await getPool();
  try {
    const rolled = await migrateDown(MIGRATIONS_DIR, pool, count);
    console.log(`\n✅ Rollback complete. Rolled back ${rolled} migration(s).`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function showStatus(): Promise<void> {
  const pool = await getPool();
  try {
    const status = await getMigrationStatus(MIGRATIONS_DIR, pool);

    console.log('\n📊 Migration Status:\n');
    console.log('Status  | Migration Name');
    console.log('--------|' + '-'.repeat(60));

    for (const migration of status) {
      const statusIcon = migration.applied ? '✅' : '⏳';
      const appliedInfo = migration.applied_at
        ? ` (${migration.applied_at.toISOString()})`
        : '';
      console.log(`${statusIcon}      | ${migration.name}${appliedInfo}`);
    }

    const pending = status.filter(m => !m.applied).length;
    const applied = status.filter(m => m.applied).length;

    console.log('\n' + '-'.repeat(70));
    console.log(`Total: ${status.length} | Applied: ${applied} | Pending: ${pending}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to get migration status:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createMigration(description: string): Promise<void> {
  if (!description || description.trim().length === 0) {
    console.error('❌ Error: Migration name is required');
    console.log('Usage: npm run migrate:create <description>');
    console.log('Example: npm run migrate:create add_users_table');
    process.exit(1);
  }

  try {
    // Ensure migrations directory exists
    await mkdir(MIGRATIONS_DIR, { recursive: true });

    const filename = generateMigrationFilename(description);
    const upPath = join(MIGRATIONS_DIR, filename);
    const downPath = join(MIGRATIONS_DIR, filename.replace('.sql', '.down.sql'));

    // Create up migration file
    const upTemplate = `-- Migration: ${description}
-- Created: ${new Date().toISOString()}
-- 
-- Add your migration SQL below:

-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;

    // Create down migration file
    const downTemplate = `-- Rollback: ${description}
-- Created: ${new Date().toISOString()}
-- 
-- Add your rollback SQL below:

-- Example:
-- DROP TABLE IF EXISTS example;
`;

    await writeFile(upPath, upTemplate, 'utf-8');
    await writeFile(downPath, downTemplate, 'utf-8');

    console.log('\n✅ Migration files created:');
    console.log(`   📄 ${filename}`);
    console.log(`   📄 ${filename.replace('.sql', '.down.sql')}`);
    console.log('\n📝 Edit these files to add your migration SQL.');
    console.log('   Then run: npm run migrate:up\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to create migration:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  switch (command) {
    case 'up':
      await runUp();
      break;

    case 'down':
      const count = arg ? parseInt(arg, 10) : 1;
      if (isNaN(count) || count < 1) {
        console.error('❌ Error: Count must be a positive number');
        process.exit(1);
      }
      await runDown(count);
      break;

    case 'status':
      await showStatus();
      break;

    case 'create':
      if (!arg) {
        console.error('Error: Migration name is required');
        process.exit(1);
      }
      await createMigration(arg);
      break;

    default:
      console.log('Usage: migrate <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  up              Apply all pending migrations');
      console.log('  down [count]    Rollback last N migrations (default: 1)');
      console.log('  status          Show migration status');
      console.log('  create <name>   Create a new migration file');
      console.log('');
      console.log('Examples:');
      console.log('  npm run migrate:up');
      console.log('  npm run migrate:down');
      console.log('  npm run migrate:down 2');
      console.log('  npm run migrate:status');
      console.log('  npm run migrate:create add_users_table');
      process.exit(1);
  }
})();
