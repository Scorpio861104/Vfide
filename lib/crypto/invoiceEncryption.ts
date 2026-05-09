/**
 * COMP-4 FIX: invoice email envelope encryption.
 *
 * Background:
 *   Invoices contain merchant + customer email addresses, line items,
 *   amounts, and sometimes free-text notes. They are PII under GDPR
 *   and equivalent privacy regimes. Storing them at rest in the
 *   database without encryption was a deferred finding from v19.8
 *   compliance audit.
 *
 * Solution:
 *   Envelope encryption with a tenant-scoped data key:
 *     - Each invoice is encrypted with a freshly-generated 256-bit
 *       AES-GCM data key (DEK)
 *     - The DEK is itself encrypted with a key-encryption key (KEK)
 *       held by a KMS (AWS KMS, GCP KMS, or HashiCorp Vault)
 *     - The encrypted DEK is stored alongside the ciphertext
 *     - Decryption requires both DB access AND KMS access
 *
 *   Why this matters: a database leak alone (the most common breach
 *   vector) does not expose plaintext invoices. An attacker would need
 *   to additionally compromise the KMS, which has its own access
 *   controls, audit logs, and key-rotation primitives.
 *
 * What this module does:
 *   - encryptInvoice(plaintext, kmsClient): returns { ciphertext, encryptedDek, iv, authTag }
 *   - decryptInvoice(envelope, kmsClient): returns plaintext
 *   - The KMS client is abstracted via the KmsClient interface so
 *     operators can plug AWS KMS, GCP KMS, Vault, or a local key
 *     (for dev). The interface has just two methods: wrap and unwrap.
 *
 * What this module does NOT do:
 *   - It does NOT provision the KEK in your KMS — that's a deploy-time
 *     operator action. The runbook is in
 *     docs/operations/INVOICE_ENCRYPTION_KMS_SETUP.md (see v19.11).
 *   - It does NOT auto-rotate keys — KEK rotation is a KMS-managed
 *     operation. The decryption side handles old + new wrapped DEKs
 *     transparently because each envelope carries its own wrapped DEK.
 *   - It does NOT migrate existing plaintext invoices — that's a
 *     one-time backfill operation; see scripts/encrypt-existing-invoices.ts.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * KMS client abstraction. Implementations:
 *   - AwsKmsClient: uses @aws-sdk/client-kms with KEK ARN
 *   - GcpKmsClient: uses @google-cloud/kms with key resource path
 *   - VaultKmsClient: uses node-vault with transit/encrypt path
 *   - LocalDevKmsClient: stores KEK in env var (DEV ONLY — DO NOT USE IN PROD)
 *
 * Each implementation handles its own auth (IAM role, service account,
 * Vault token) — this module never sees raw KMS credentials.
 */
export interface KmsClient {
  /** Encrypt a 32-byte data key with the KEK. Returns wrapped bytes. */
  wrap(plaintextDek: Buffer): Promise<Buffer>;
  /** Decrypt a wrapped data key back to 32 bytes. */
  unwrap(wrappedDek: Buffer): Promise<Buffer>;
}

export interface InvoiceEnvelope {
  /** AES-GCM ciphertext of the JSON-serialized invoice. */
  ciphertext: Buffer;
  /** KMS-wrapped data encryption key (DEK). */
  encryptedDek: Buffer;
  /** AES-GCM initialization vector (12 bytes for GCM). */
  iv: Buffer;
  /** AES-GCM auth tag (16 bytes). */
  authTag: Buffer;
  /** Schema version for forward-compatible decryption. */
  version: 1;
}

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DEK_LENGTH = 32; // 256 bits

/**
 * Encrypt an invoice for storage. The plaintext is whatever you want
 * to keep confidential — typically the JSON-serialized invoice with
 * customer details, line items, and notes.
 *
 * Returns an envelope that contains everything needed to decrypt
 * GIVEN ACCESS TO THE KMS — but nothing decryptable on its own.
 *
 * Errors:
 *   - Throws if the KMS wrap call fails. Callers should handle this
 *     by treating the invoice as unstoreable (log + retry queue).
 */
export async function encryptInvoice(
  plaintext: string,
  kms: KmsClient,
): Promise<InvoiceEnvelope> {
  // Generate a fresh DEK for this invoice. Per envelope-encryption
  // best practice, every invoice gets its own DEK — never reuse.
  const dek = randomBytes(DEK_LENGTH);

  // Random IV for AES-GCM. GCM REQUIRES a unique IV per encryption
  // with the same key; since the DEK is unique per invoice, this is
  // automatically safe, but we still generate a fresh IV.
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Wrap the DEK with the KMS-managed KEK. The KMS holds the KEK
  // private; we never see it. Even if our DB is leaked, the wrapped
  // DEK is unusable without KMS access.
  const encryptedDek = await kms.wrap(dek);

  // Best-effort scrub the DEK from memory. Node doesn't guarantee
  // this on its own, but it's better than not trying.
  dek.fill(0);

  return {
    ciphertext,
    encryptedDek,
    iv,
    authTag,
    version: 1,
  };
}

/**
 * Decrypt an invoice envelope. Requires the same KMS that wrapped
 * the DEK (or a KMS that has access to the same KEK after KEK
 * rotation — KMS handles version selection transparently).
 *
 * Errors:
 *   - Throws if the KMS unwrap call fails (e.g. wrong KEK).
 *   - Throws if the auth tag doesn't verify (envelope was tampered).
 *   - Throws if the version is unrecognized (forward incompatibility).
 */
export async function decryptInvoice(
  envelope: InvoiceEnvelope,
  kms: KmsClient,
): Promise<string> {
  if (envelope.version !== 1) {
    throw new Error(`decryptInvoice: unsupported envelope version ${envelope.version}`);
  }

  const dek = await kms.unwrap(envelope.encryptedDek);
  if (dek.length !== DEK_LENGTH) {
    throw new Error(`decryptInvoice: unwrapped DEK has wrong length ${dek.length}`);
  }

  try {
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, dek, envelope.iv);
    decipher.setAuthTag(envelope.authTag);
    const plaintext = Buffer.concat([
      decipher.update(envelope.ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } finally {
    dek.fill(0);
  }
}

/**
 * Serialize an envelope for DB storage. We base64-encode each binary
 * field so the entire envelope can live in a JSONB column.
 */
export function serializeEnvelope(env: InvoiceEnvelope): string {
  return JSON.stringify({
    v: env.version,
    ct: env.ciphertext.toString('base64'),
    dek: env.encryptedDek.toString('base64'),
    iv: env.iv.toString('base64'),
    tag: env.authTag.toString('base64'),
  });
}

/**
 * Deserialize the JSON form back into an envelope ready to decrypt.
 */
export function deserializeEnvelope(json: string): InvoiceEnvelope {
  const parsed = JSON.parse(json);
  if (parsed.v !== 1) {
    throw new Error(`deserializeEnvelope: unsupported version ${parsed.v}`);
  }
  return {
    version: 1,
    ciphertext: Buffer.from(parsed.ct, 'base64'),
    encryptedDek: Buffer.from(parsed.dek, 'base64'),
    iv: Buffer.from(parsed.iv, 'base64'),
    authTag: Buffer.from(parsed.tag, 'base64'),
  };
}

/**
 * Local-dev KMS client. Stores the KEK in an env var. NEVER use this
 * in production — the env var lives in plaintext alongside everything
 * else. The whole point of envelope encryption is to separate the KEK
 * from the data store; a local-dev KEK doesn't do that.
 *
 * Use only when:
 *   - Running locally without cloud KMS
 *   - Running tests that exercise the encryption path
 *
 * The class throws loudly if NODE_ENV is 'production' to prevent
 * accidental misuse.
 */
export class LocalDevKmsClient implements KmsClient {
  private kek: Buffer;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'LocalDevKmsClient must NOT be used in production. ' +
          'Wire AwsKmsClient or equivalent.',
      );
    }
    const raw = process.env.LOCAL_DEV_KEK_BASE64;
    if (!raw || raw.length < 44) {
      throw new Error(
        'LocalDevKmsClient: set LOCAL_DEV_KEK_BASE64 to a 32-byte base64 key. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      );
    }
    this.kek = Buffer.from(raw, 'base64');
    if (this.kek.length !== 32) {
      throw new Error('LocalDevKmsClient: LOCAL_DEV_KEK_BASE64 must decode to exactly 32 bytes');
    }
  }

  async wrap(plaintextDek: Buffer): Promise<Buffer> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.kek, iv);
    const wrapped = Buffer.concat([cipher.update(plaintextDek), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Concat iv + tag + wrapped so unwrap can split them apart.
    return Buffer.concat([iv, tag, wrapped]);
  }

  async unwrap(wrappedDek: Buffer): Promise<Buffer> {
    if (wrappedDek.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      throw new Error('LocalDevKmsClient.unwrap: malformed input');
    }
    const iv = wrappedDek.subarray(0, IV_LENGTH);
    const tag = wrappedDek.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = wrappedDek.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.kek, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
