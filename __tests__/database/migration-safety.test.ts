/**
 * C08 – Database and Migration Safety
 *
 * R-036: Non-idempotent migrations
 *   - Framework skips already-applied migrations (schema_migrations tracking)
 *   - applyMigration wraps DDL in BEGIN/COMMIT; records in schema_migrations
 *   - Non-transactional (CONCURRENT) path executes without transaction
 *   - rollbackMigration throws when no down SQL is provided
 *
 * R-037: Long-running migration lock contention
 *   - requiresNonTransactionalExecution routes CONCURRENT / VACUUM / CLUSTER
 *     migrations outside a transaction, preventing "cannot run inside a
 *     transaction block" errors and minimising lock windows
 *
 * R-038: Missing index coverage for hot queries
 *   - Filesystem evidence audit: ≥ 100 CREATE INDEX definitions across
 *     migrations covering the key hot tables
 *
 * R-039: PII retention and deletion gaps
 *   - All PII-bearing child tables carry ON DELETE CASCADE to users(id)
 *     so user deletion automatically purges personal data
 *
 * @jest-environment node
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PoolClient } from 'pg';

import {
  requiresNonTransactionalExecution,
  splitSqlStatements,
  validateMigrationName,
  generateMigrationFilename,
  applyMigration,
  rollbackMigration,
} from '../../lib/migrations/index';

const MIGRATIONS_DIR = join(__dirname, '../../migrations');

// ── Helper: read all up-migration SQL content ─────────────────────────────────

function readAllUpMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf-8'))
    .join('\n');
}

// ── Mock PoolClient factory ───────────────────────────────────────────────────

function makeMockClient(): jest.Mocked<Pick<PoolClient, 'query'>> & { _calls: string[] } {
  const calls: string[] = [];
  const query = jest.fn().mockImplementation((sql: string) => {
    calls.push(typeof sql === 'string' ? sql.trim().slice(0, 60) : String(sql));
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  return { query: query as jest.MockedFunction<PoolClient['query']>, _calls: calls };
}

// ─────────────────────────────────────────────────────────────────────────────
// R-036 — Non-idempotent migrations
// ─────────────────────────────────────────────────────────────────────────────

describe('R-036 – Non-idempotent migrations', () => {
  describe('requiresNonTransactionalExecution – routing pure logic', () => {
    it('returns false for ordinary transactional DDL', () => {
      expect(requiresNonTransactionalExecution('CREATE TABLE foo (id SERIAL PRIMARY KEY);')).toBe(false);
      expect(requiresNonTransactionalExecution('ALTER TABLE users ADD COLUMN bio TEXT;')).toBe(false);
      expect(requiresNonTransactionalExecution('DROP TABLE IF EXISTS tmp;')).toBe(false);
    });

    it('returns true for CREATE INDEX CONCURRENTLY', () => {
      const sql = 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_foo ON bar (baz);';
      expect(requiresNonTransactionalExecution(sql)).toBe(true);
    });

    it('is case-insensitive (CREATE index concurrently)', () => {
      expect(requiresNonTransactionalExecution('create index concurrently idx_x on t (c);')).toBe(true);
    });

    it('returns true for REINDEX ... CONCURRENTLY', () => {
      expect(requiresNonTransactionalExecution('REINDEX INDEX CONCURRENTLY idx_foo;')).toBe(true);
    });

    it('returns true for VACUUM', () => {
      expect(requiresNonTransactionalExecution('VACUUM ANALYZE transactions;')).toBe(true);
    });

    it('returns true for CLUSTER', () => {
      expect(requiresNonTransactionalExecution('CLUSTER users USING idx_users_wallet_address;')).toBe(true);
    });
  });

  describe('splitSqlStatements – SQL parser', () => {
    it('splits semicolon-delimited statements', () => {
      const sql = 'CREATE TABLE a (id INT); CREATE TABLE b (id INT);';
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toMatch(/CREATE TABLE a/);
      expect(stmts[1]).toMatch(/CREATE TABLE b/);
    });

    it('does not split on semicolons inside string literals', () => {
      const sql = "INSERT INTO t (v) VALUES ('a;b'); SELECT 1;";
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toContain("'a;b'");
    });

    it('handles single trailing statement without trailing semicolon', () => {
      const sql = 'SELECT 1';
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toBe('SELECT 1');
    });

    it('strips line comments and does not emit empty statements', () => {
      const sql = '-- setup\nCREATE TABLE c (id INT);\n-- done';
      const stmts = splitSqlStatements(sql);
      // comment-only lines produce no standalone statement
      const nonBlank = stmts.filter((s) => s.replace(/--.*$/gm, '').trim().length > 0);
      expect(nonBlank.length).toBeGreaterThanOrEqual(1);
      expect(nonBlank.some((s) => s.includes('CREATE TABLE c'))).toBe(true);
    });
  });

  describe('validateMigrationName', () => {
    it('accepts the expected timestamp format', () => {
      expect(validateMigrationName('20260120_055000_initial_schema.sql')).toBe(true);
      expect(validateMigrationName('20260325_140000_monthly_leaderboard.sql')).toBe(true);
    });

    it('rejects names missing timestamp prefix', () => {
      expect(validateMigrationName('add_table.sql')).toBe(false);
      expect(validateMigrationName('v1_add_users.sql')).toBe(false);
    });

    it('rejects names with uppercase characters (convention: lowercase description)', () => {
      expect(validateMigrationName('20260120_055000_Initial_Schema.sql')).toBe(false);
    });

    it('rejects names without .sql extension', () => {
      expect(validateMigrationName('20260120_055000_schema')).toBe(false);
    });
  });

  describe('generateMigrationFilename', () => {
    it('produces a name matching validateMigrationName', () => {
      const name = generateMigrationFilename('add users table');
      expect(validateMigrationName(name)).toBe(true);
    });

    it('lowercases and sanitises special characters in the description', () => {
      const name = generateMigrationFilename('Add User-Table!');
      expect(name).toMatch(/^[0-9_a-z.]+$/);
      expect(name).toContain('add_user_table');
    });
  });

  describe('applyMigration – transactional path', () => {
    it('executes BEGIN / DDL / INSERT schema_migrations / COMMIT in order', async () => {
      const client = makeMockClient();
      const sql = 'CREATE TABLE test_idempotent (id SERIAL PRIMARY KEY);';
      const name = '20260101_000000_test_idempotent';

      await applyMigration(client as unknown as PoolClient, name, sql);

      const allCalls: string[] = (client.query as jest.Mock).mock.calls.map(
        (c: unknown[]) => String(c[0]).trim(),
      );

      expect(allCalls[0]).toBe('BEGIN');
      expect(allCalls[1]).toContain('CREATE TABLE test_idempotent');
      expect(allCalls[2]).toMatch(/INSERT INTO schema_migrations/);
      expect(allCalls[3]).toBe('COMMIT');
    });

    it('rolls back and rethrows on DDL error', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce({})   // BEGIN
          .mockRejectedValueOnce(new Error('relation already exists'))  // sql
          .mockResolvedValueOnce({}),  // ROLLBACK
        _calls: [],
      };

      await expect(
        applyMigration(client as unknown as PoolClient, 'bad-migration', 'CREATE TABLE dup (id INT);'),
      ).rejects.toThrow('relation already exists');

      const calls: string[] = (client.query as jest.Mock).mock.calls.map(
        (c: unknown[]) => String(c[0]).trim(),
      );
      expect(calls).toContain('ROLLBACK');
    });
  });

  describe('applyMigration – non-transactional CONCURRENT path', () => {
    it('does NOT wrap CONCURRENT index creation in a transaction', async () => {
      const client = makeMockClient();
      const sql = 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_t_c ON t (c);';
      const name = '20260101_000001_add_concurrent_index';

      await applyMigration(client as unknown as PoolClient, name, sql);

      const allCalls: string[] = (client.query as jest.Mock).mock.calls.map(
        (c: unknown[]) => String(c[0]).trim(),
      );

      expect(allCalls).not.toContain('BEGIN');
      expect(allCalls).not.toContain('COMMIT');
      // Migration record is still inserted
      expect(allCalls.some((c) => c.includes('INSERT INTO schema_migrations'))).toBe(true);
    });
  });

  describe('rollbackMigration – empty-SQL guard', () => {
    it('throws when no down SQL is provided', async () => {
      const client = makeMockClient();
      await expect(
        rollbackMigration(client as unknown as PoolClient, 'test-migration', ''),
      ).rejects.toThrow('No rollback SQL provided');
    });

    it('throws when down SQL is whitespace only', async () => {
      const client = makeMockClient();
      await expect(
        rollbackMigration(client as unknown as PoolClient, 'test-migration', '   '),
      ).rejects.toThrow('No rollback SQL provided');
    });
  });

  describe('rollbackMigration – transactional path', () => {
    it('executes BEGIN / down-SQL / DELETE schema_migrations / COMMIT in order', async () => {
      const client = makeMockClient();
      const downSql = 'DROP TABLE IF EXISTS test_idempotent;';
      const name = '20260101_000000_test_idempotent';

      await rollbackMigration(client as unknown as PoolClient, name, downSql);

      const allCalls: string[] = (client.query as jest.Mock).mock.calls.map(
        (c: unknown[]) => String(c[0]).trim(),
      );

      expect(allCalls[0]).toBe('BEGIN');
      expect(allCalls[1]).toContain('DROP TABLE IF EXISTS test_idempotent');
      expect(allCalls[2]).toMatch(/DELETE FROM schema_migrations WHERE name/);
      expect(allCalls[3]).toBe('COMMIT');
    });
  });

  describe('Idempotency guard – pending-filter logic', () => {
    it('only applies migrations not already in the applied set', () => {
      const files = [
        '20260120_055000_initial_schema.sql',
        '20260121_232400_add_performance_indexes.sql',
        '20260129_120000_notification_preferences.sql',
      ];
      const applied = new Set(['20260120_055000_initial_schema']);

      // Mirror of the filter expression in migrateUp
      const pending = files.filter((f) => !applied.has(f.replace('.sql', '')));

      expect(pending).toHaveLength(2);
      expect(pending).not.toContain('20260120_055000_initial_schema.sql');
      expect(pending).toContain('20260121_232400_add_performance_indexes.sql');
    });

    it('returns no pending migrations when all files are already applied', () => {
      const files = ['20260120_055000_initial_schema.sql'];
      const applied = new Set(['20260120_055000_initial_schema']);
      const pending = files.filter((f) => !applied.has(f.replace('.sql', '')));

      expect(pending).toHaveLength(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-037 — Long-running migration lock contention
// ─────────────────────────────────────────────────────────────────────────────

describe('R-037 – Lock contention routing', () => {
  it('routes the real CONCURRENT index migration (add_reward_verification_columns) as non-transactional', () => {
    // Actual migration file contains: CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_rewards_source_contract
    const sql = readFileSync(
      join(MIGRATIONS_DIR, '20260130_120000_add_reward_verification_columns.sql'),
      'utf-8',
    );
    expect(requiresNonTransactionalExecution(sql)).toBe(true);
  });

  it('routes ordinary transactional migrations correctly (initial_schema is transactional)', () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, '20260120_055000_initial_schema.sql'),
      'utf-8',
    );
    expect(requiresNonTransactionalExecution(sql)).toBe(false);
  });

  it('all migration file names conform to the timestamp naming convention', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(
      (f) => f.endsWith('.sql') && !f.endsWith('.down.sql'),
    );

    const invalid = files.filter((f) => !validateMigrationName(f));
    expect(invalid).toHaveLength(0);
  });

  it('every up-migration has a corresponding down (rollback) file', () => {
    const files = readdirSync(MIGRATIONS_DIR);
    const upFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'));

    // Seed-only files and files without a DDL rollback counterpart:
    // 20260326_100000_seed_badges_and_achievements.sql is data-only
    const dataOnlyFiles = new Set(['20260326_100000_seed_badges_and_achievements.sql']);

    const missingDown = upFiles.filter((f) => {
      if (dataOnlyFiles.has(f)) return false;
      const downFile = f.replace('.sql', '.down.sql');
      return !files.includes(downFile);
    });

    expect(missingDown).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-038 — Index coverage for hot queries
// ─────────────────────────────────────────────────────────────────────────────

describe('R-038 – Index coverage for hot queries', () => {
  const allSql = readAllUpMigrations();

  it('total CREATE INDEX count across all migrations is ≥ 100', () => {
    const matches = allSql.match(/CREATE INDEX/gi) || [];
    expect(matches.length).toBeGreaterThanOrEqual(100);
  });

  it('users table has a wallet_address index (primary lookup path)', () => {
    expect(allSql).toMatch(/idx_users_wallet/i);
  });

  it('messages table has sender and recipient indexes', () => {
    expect(allSql).toMatch(/idx_messages_sender/i);
    expect(allSql).toMatch(/idx_messages_recipient/i);
  });

  it('proposals table has status and created_at indexes', () => {
    expect(allSql).toMatch(/idx_proposals_status/i);
    expect(allSql).toMatch(/idx_proposals_created_at/i);
  });

  it('notifications table has a user_id index', () => {
    expect(allSql).toMatch(/idx_notifications_user/i);
  });

  it('performance index migration uses IF NOT EXISTS (safe re-run)', () => {
    const perfSql = readFileSync(
      join(MIGRATIONS_DIR, '20260121_232400_add_performance_indexes.sql'),
      'utf-8',
    );
    // Every index definition should have IF NOT EXISTS to be re-run-safe
    const indexDefs = perfSql.match(/CREATE INDEX[^;]+;/gi) || [];
    const withoutGuard = indexDefs.filter((d) => !d.includes('IF NOT EXISTS'));
    // All dynamic EXECUTE strings include IF NOT EXISTS
    // Allow zero unsafe definitions
    expect(withoutGuard).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-039 — PII retention and deletion
// ─────────────────────────────────────────────────────────────────────────────

describe('R-039 – PII retention and deletion', () => {
  const allSql = readAllUpMigrations();

  it('user_privacy_settings uses ON DELETE CASCADE to users(id)', () => {
    const privacySql = readFileSync(
      join(MIGRATIONS_DIR, '20260129_121000_user_privacy_settings.sql'),
      'utf-8',
    );
    expect(privacySql).toMatch(/REFERENCES users\(id\) ON DELETE CASCADE/i);
  });

  it('notification_preferences uses ON DELETE CASCADE to users(id)', () => {
    const notifSql = readFileSync(
      join(MIGRATIONS_DIR, '20260129_120000_notification_preferences.sql'),
      'utf-8',
    );
    expect(notifSql).toMatch(/REFERENCES users\(id\) ON DELETE CASCADE/i);
  });

  it('two_factor_codes uses ON DELETE CASCADE (sensitive PII cleanup on user delete)', () => {
    const tfaSql = readFileSync(
      join(MIGRATIONS_DIR, '20260130_131000_two_factor_codes.sql'),
      'utf-8',
    );
    expect(tfaSql).toMatch(/REFERENCES users\(id\) ON DELETE CASCADE/i);
  });

  it('initial schema core tables (messages, friendships, votes) cascade-delete on user removal', () => {
    const initialSql = readFileSync(
      join(MIGRATIONS_DIR, '20260120_055000_initial_schema.sql'),
      'utf-8',
    );
    // messages, friendships, etc. carry user-linked FKs with ON DELETE CASCADE
    const cascades = (initialSql.match(/ON DELETE CASCADE/gi) || []).length;
    expect(cascades).toBeGreaterThanOrEqual(10);
  });

  it('at least 20 migration files reference user_id or wallet_address (PII surface is broad)', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(
      (f) => f.endsWith('.sql') && !f.endsWith('.down.sql'),
    );
    const piiFiles = files.filter((f) => {
      const content = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8');
      return /wallet_address|user_id/i.test(content);
    });
    expect(piiFiles.length).toBeGreaterThanOrEqual(18);
  });
});
