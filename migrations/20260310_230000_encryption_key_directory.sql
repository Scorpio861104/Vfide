CREATE TABLE IF NOT EXISTS encryption_key_directory (
  address VARCHAR(42) PRIMARY KEY,
  encryption_public_key TEXT NOT NULL,
  algorithm VARCHAR(64) NOT NULL DEFAULT 'ECDH-P256-SPKI',
  proof_signature TEXT NOT NULL,
  proof_message TEXT NOT NULL,
  proof_timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK (address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX IF NOT EXISTS idx_encryption_key_directory_active
  ON encryption_key_directory(address)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_encryption_key_directory_updated_at
  ON encryption_key_directory(updated_at DESC);
