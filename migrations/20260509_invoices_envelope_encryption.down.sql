-- COMP-4 FIX: rollback for invoice envelope encryption migration.
--
-- This drops the encryption columns. ONLY safe if the backfill has
-- not yet run, OR you have an authoritative plaintext source to
-- recover from (the original plaintext columns).
--
-- DANGEROUS if the plaintext columns have already been dropped by
-- a later migration. In that case, dropping encrypted_envelope
-- destroys the only copy of the invoice PII permanently.
--
-- Procedure if you must roll back AFTER the plaintext drop:
--   1. STOP. Do not run this script.
--   2. Run scripts/rewrap-invoice-deks.ts in DECRYPT-TO-COLUMNS mode
--      to restore plaintext columns from the envelope.
--   3. Verify all rows decrypted successfully.
--   4. THEN run this rollback.

DROP INDEX IF EXISTS idx_invoices_envelope_pending;

ALTER TABLE invoices DROP COLUMN IF EXISTS encrypted_envelope;
ALTER TABLE invoices DROP COLUMN IF EXISTS encrypted_at;
