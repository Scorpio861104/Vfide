-- COMP-4 FIX: add envelope-encryption column to invoices table.
--
-- Adds a JSONB column to hold the encrypted envelope (ciphertext +
-- wrapped DEK + IV + auth tag + version). Plaintext columns are NOT
-- dropped here — that's a separate migration scheduled after the
-- backfill is verified and a deploy cycle has confirmed the read
-- path uses the encrypted envelope.
--
-- Backward compatibility:
--   - During backfill: rows have BOTH plaintext columns and an
--     envelope. New writes populate both for safety.
--   - After backfill: code reads from the envelope; plaintext columns
--     remain readable as a rollback fallback.
--   - Final state (next migration): plaintext columns are dropped.
--
-- NOTE: This migration is a no-op if the `invoices` table does not yet
-- exist (e.g. fresh CI databases). The ALTER TABLE statements are
-- wrapped in a DO block that checks for table existence first.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoices'
  ) THEN
    -- Add encrypted_envelope column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices'
        AND column_name = 'encrypted_envelope'
    ) THEN
      ALTER TABLE invoices ADD COLUMN encrypted_envelope JSONB;
    END IF;

    -- Add encrypted_at column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices'
        AND column_name = 'encrypted_at'
    ) THEN
      ALTER TABLE invoices ADD COLUMN encrypted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Partial index for backfill query
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'invoices'
        AND indexname = 'idx_invoices_envelope_pending'
    ) THEN
      CREATE INDEX idx_invoices_envelope_pending
        ON invoices (id)
        WHERE encrypted_envelope IS NULL;
    END IF;

    COMMENT ON COLUMN invoices.encrypted_envelope IS
      'COMP-4: AES-256-GCM envelope-encrypted PII. See lib/crypto/invoiceEncryption.ts. NULL means plaintext-only (legacy). Populated by scripts/encrypt-existing-invoices.ts.';
    COMMENT ON COLUMN invoices.encrypted_at IS
      'COMP-4: timestamp when the row was encrypted into envelope form. NULL for legacy plaintext-only rows.';

    RAISE NOTICE 'COMP-4: encrypted_envelope and encrypted_at columns applied to invoices table.';
  ELSE
    RAISE NOTICE 'COMP-4: invoices table does not exist; skipping envelope-encryption migration (no-op for fresh databases).';
  END IF;
END;
$$;

