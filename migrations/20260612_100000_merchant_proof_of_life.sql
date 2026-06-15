-- Wave 93 / CID-2 (off-chain half) — business-level proof-of-life.
--
-- The civilization-wide "I'm alive" model (Wave 92): a designated proof-of-life signal should stop ANY
-- "you're gone" process, not just inheritance. On-chain this is the inheritance manager's proofOfLifeWallet
-- (now also honored by recovery — see VaultRecoveryClaim, DRAFT). The BUSINESS-continuity flow is off-chain
-- and doesn't know the on-chain wallet, so it gets its own designation here (clean separation: business ≠
-- vault). A business owner can name a trusted proof-of-life address that may VETO an emergency business
-- transfer while the owner is unreachable — the same alive-signal role, for the business side.

CREATE TABLE IF NOT EXISTS merchant_proof_of_life (
  merchant_address TEXT PRIMARY KEY,
  -- The trusted address that may veto an emergency business transfer on the owner's behalf.
  proof_of_life_address TEXT NOT NULL,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_pol_addr ON merchant_proof_of_life(proof_of_life_address);

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_proof_of_life TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;
