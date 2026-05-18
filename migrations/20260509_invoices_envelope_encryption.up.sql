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

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS encrypted_envelope JSONB;

-- Partial index so the backfill query (WHERE encrypted_envelope IS NULL)
-- runs against an index, not a full scan. Drop this index in the next
-- migration once the backfill is complete.
CREATE INDEX IF NOT EXISTS idx_invoices_envelope_pending
  ON invoices (id)
  WHERE encrypted_envelope IS NULL;

-- For audit: track when the envelope was created. Useful when
-- investigating "was this invoice encrypted yet at time T?".
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN invoices.encrypted_envelope IS
  'COMP-4: AES-256-GCM envelope-encrypted PII. See lib/crypto/invoiceEncryption.ts. NULL means plaintext-only (legacy). Populated by scripts/encrypt-existing-invoices.ts.';
COMMENT ON COLUMN invoices.encrypted_at IS
  'COMP-4: timestamp when the row was encrypted into envelope form. NULL for legacy plaintext-only rows.';
