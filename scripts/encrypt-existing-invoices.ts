#!/usr/bin/env node
/**
 * COMP-4 FIX: one-time backfill of plaintext invoices into envelope-
 * encrypted form.
 *
 * Background:
 *   The `invoices` table has historically stored PII fields
 *   (customer_email, line_items JSON blob, free-text notes, sometimes
 *   shipping addresses) as plaintext columns. v19.11 adds a JSONB
 *   `encrypted_envelope` column (see the up.sql migration) and the
 *   encryption module (lib/crypto/invoiceEncryption.ts).
 *
 *   This script encrypts every existing invoice once at deploy time.
 *   It is idempotent: re-runs skip rows that already have an envelope.
 *
 * Modes:
 *   --dry-run    — count and report; no DB writes
 *   --apply      — perform the encryption
 *   --verify     — sample 10 random rows, decrypt and check
 *   --batch=N    — batch size, default 100
 *
 * Safety:
 *   - Plaintext columns are NOT dropped by this script. Schedule a
 *     follow-up migration after the backfill is verified AND a deploy
 *     cycle has confirmed the read path uses the envelope.
 *   - Errors during encryption fail the row but not the whole run.
 *     Failed rows are logged for retry.
 *   - The script must be run from a machine that has KMS access. It
 *     will fail loudly if INVOICE_KMS_PROVIDER is not configured.
 *
 * Usage:
 *   npm run -s backfill:invoice-encryption -- --dry-run
 *   npm run -s backfill:invoice-encryption -- --apply
 *   npm run -s backfill:invoice-encryption -- --verify
 */

import { argv, exit } from 'node:process';
import { query } from '../lib/db';
import { encryptInvoice, decryptInvoice, serializeEnvelope, deserializeEnvelope } from '../lib/crypto/invoiceEncryption';
import { logger } from '../lib/logger';

const ARG_DRY_RUN = argv.includes('--dry-run');
const ARG_APPLY = argv.includes('--apply');
const ARG_VERIFY = argv.includes('--verify');
const BATCH_SIZE = (() => {
  const arg = argv.find((a) => a.startsWith('--batch='));
  if (!arg) return 100;
  const batchStr = arg.split('=')[1] ?? '100';
  return Math.max(1, Math.min(1000, parseInt(batchStr, 10) || 100));
})();

if (!ARG_DRY_RUN && !ARG_APPLY && !ARG_VERIFY) {
  console.error('Pass exactly one of: --dry-run, --apply, --verify');
  exit(2);
}

interface InvoiceRow {
  id: string;
  customer_email: string | null;
  line_items: unknown;
  notes: string | null;
  shipping_address: string | null;
  encrypted_envelope: string | null;
}

/**
 * Load the appropriate KMS client based on env. The dynamic import
 * lets us avoid bundling all three KMS SDK clients on every deploy —
 * only the one configured for this environment is loaded.
 */
async function loadKmsClient() {
  const provider = process.env.INVOICE_KMS_PROVIDER;
  if (!provider) {
    console.error('INVOICE_KMS_PROVIDER not set. See docs/operations/INVOICE_ENCRYPTION_KMS_SETUP.md');
    exit(2);
  }

  // We import client implementations dynamically. The actual client
  // implementations live in lib/crypto/kmsClients/{aws,gcp,vault}.ts
  // and are selected based on provider. For the v19.11 patch only the
  // LocalDevKmsClient is shipped inline; cloud client implementations
  // are operator-implemented (the interface is well-documented and
  // each provider's SDK has a one-screen wrapper).
  if (provider === 'local-dev') {
    const { LocalDevKmsClient } = await import('../lib/crypto/invoiceEncryption');
    return new LocalDevKmsClient();
  }

  console.error(`INVOICE_KMS_PROVIDER=${provider} requires the corresponding client in lib/crypto/kmsClients/.`);
  console.error('See the runbook for the per-provider implementation pattern.');
  exit(2);
}

/**
 * Build the canonical plaintext form of an invoice for encryption.
 * Important: the order and shape of this JSON must remain stable so
 * that decryption + future schema migrations behave predictably.
 */
function canonicalizeInvoice(row: InvoiceRow): string {
  return JSON.stringify({
    customer_email: row.customer_email ?? null,
    line_items: row.line_items ?? null,
    notes: row.notes ?? null,
    shipping_address: row.shipping_address ?? null,
  });
}

async function countTotal(): Promise<{ total: number; pending: number }> {
  const totalRes = await query<{ count: string }>('SELECT COUNT(*) AS count FROM invoices');
  const pendingRes = await query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM invoices WHERE encrypted_envelope IS NULL",
  );
  return {
    total: parseInt(totalRes.rows[0]?.count ?? '0', 10),
    pending: parseInt(pendingRes.rows[0]?.count ?? '0', 10),
  };
}

async function dryRun() {
  const { total, pending } = await countTotal();
  console.log(`[backfill] total invoices:   ${total}`);
  console.log(`[backfill] needs encrypting: ${pending}`);
  console.log(`[backfill] already encrypted: ${total - pending}`);
  console.log(`[backfill] estimated batches: ${Math.ceil(pending / BATCH_SIZE)}`);
}

async function apply() {
  const kms = await loadKmsClient();
  const { pending } = await countTotal();
  if (pending === 0) {
    console.log('[backfill] nothing to encrypt; all invoices have envelopes.');
    return;
  }

  console.log(`[backfill] encrypting ${pending} invoices in batches of ${BATCH_SIZE}...`);
  let succeeded = 0;
  let failed = 0;

  while (true) {
    const { rows } = await query<InvoiceRow>(
      `SELECT id, customer_email, line_items, notes, shipping_address, encrypted_envelope
       FROM invoices
       WHERE encrypted_envelope IS NULL
       ORDER BY id
       LIMIT $1`,
      [BATCH_SIZE],
    );
    if (rows.length === 0) break;

    for (const row of rows) {
      try {
        const plaintext = canonicalizeInvoice(row);
        const env = await encryptInvoice(plaintext, kms);
        const serialized = serializeEnvelope(env);
        await query(
          'UPDATE invoices SET encrypted_envelope = $1::jsonb WHERE id = $2 AND encrypted_envelope IS NULL',
          [serialized, row.id],
        );
        succeeded++;
      } catch (e) {
        failed++;
        // Log per-row failure and keep going. Failures get retried on
        // the next run (the WHERE clause picks them up again).
        logger.error(`[backfill] failed to encrypt invoice ${row.id}:`, e);
      }
    }

    const completed = succeeded + failed;
    if (completed % 1000 === 0 || rows.length < BATCH_SIZE) {
      console.log(`[backfill] progress: ${completed}/${pending} (succeeded=${succeeded} failed=${failed})`);
    }
  }

  console.log(`[backfill] done. succeeded=${succeeded} failed=${failed}`);
  if (failed > 0) {
    console.error(`[backfill] ${failed} rows failed; re-run --apply to retry. Check logs for specific errors.`);
    exit(1);
  }
}

async function verify() {
  const kms = await loadKmsClient();
  console.log('[backfill] verifying random sample of 10 encrypted invoices...');
  const { rows } = await query<InvoiceRow>(
    `SELECT id, customer_email, line_items, notes, shipping_address, encrypted_envelope
     FROM invoices
     WHERE encrypted_envelope IS NOT NULL
     ORDER BY RANDOM()
     LIMIT 10`,
  );
  if (rows.length === 0) {
    console.log('[backfill] no encrypted invoices to verify.');
    return;
  }

  let ok = 0;
  let mismatch = 0;
  for (const row of rows) {
    try {
      const env = deserializeEnvelope(row.encrypted_envelope!);
      const decrypted = await decryptInvoice(env, kms);
      const expected = canonicalizeInvoice(row);
      if (decrypted === expected) {
        ok++;
      } else {
        mismatch++;
        console.error(`[backfill] MISMATCH for invoice ${row.id}: decrypted does not match plaintext columns`);
      }
    } catch (e) {
      mismatch++;
      console.error(`[backfill] DECRYPT FAILED for invoice ${row.id}:`, e);
    }
  }
  console.log(`[backfill] verify: ok=${ok} mismatch=${mismatch}`);
  if (mismatch > 0) exit(1);
}

async function main() {
  if (ARG_DRY_RUN) await dryRun();
  else if (ARG_APPLY) await apply();
  else if (ARG_VERIFY) await verify();
}

main().catch((e) => {
  console.error('[backfill] fatal error:', e);
  exit(1);
});
