# Invoice Encryption KMS Setup Runbook

## Purpose

VFIDE invoices contain PII: merchant + customer email addresses, line items, free-text notes, sometimes shipping addresses. Under GDPR and equivalent privacy regimes, this data must be encrypted at rest with keys held outside the database.

`lib/crypto/invoiceEncryption.ts` (added in v19.11 for COMP-4) handles the encryption side: envelope encryption with a per-invoice AES-256-GCM data key, where the data key itself is wrapped by a KMS-managed key-encryption key (KEK).

This runbook walks operators through provisioning the KEK in their cloud KMS of choice, configuring the application to use it, and rotating keys safely.

## Pick your KMS

| KMS | When to use |
|---|---|
| AWS KMS | Already on AWS; want IAM-based access; cheapest at low volume |
| GCP KMS | Already on GCP; want service-account based access |
| HashiCorp Vault | Self-hosted; want full control; have ops bandwidth to run Vault |
| Azure Key Vault | Already on Azure |
| Local dev key | Dev/test only — never production |

The application code is KMS-agnostic via the `KmsClient` interface. You implement `wrap()` and `unwrap()` against your chosen KMS, register the client at app boot, and that's it.

---

## Option A: AWS KMS

### 1. Create the KEK

```bash
aws kms create-key \
  --description "VFIDE invoice envelope encryption KEK" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --tags TagKey=Application,TagValue=VFIDE TagKey=Purpose,TagValue=invoice-encryption
```

Capture the resulting `KeyId` (e.g. `1234abcd-12ab-34cd-56ef-1234567890ab`).

### 2. Create an alias so rotation doesn't break the config

```bash
aws kms create-alias \
  --alias-name alias/vfide-invoice-kek \
  --target-key-id <key-id-from-step-1>
```

In the application config use the alias, not the key ID. When you rotate, you rebind the alias to the new key without touching app config.

### 3. Set up the IAM role for the application

The application needs `kms:Encrypt` and `kms:Decrypt` on this specific key. Nothing more.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["kms:Encrypt", "kms:Decrypt"],
      "Resource": "arn:aws:kms:<region>:<account>:alias/vfide-invoice-kek"
    }
  ]
}
```

Attach this policy to the role assumed by the application's runtime (ECS task role, EKS pod identity, EC2 instance profile, Lambda execution role — whichever applies).

### 4. Enable automatic key rotation

```bash
aws kms enable-key-rotation --key-id alias/vfide-invoice-kek
```

AWS rotates the KEK once per year automatically. Existing wrapped DEKs continue to decrypt because AWS keeps old key material around — that's the whole point of using the alias.

### 5. Configure the application

Set these env vars on the application's runtime:

```bash
INVOICE_KMS_PROVIDER=aws
AWS_KMS_KEK_ALIAS=alias/vfide-invoice-kek
AWS_REGION=<your-region>
# Credentials provided by IAM role; do NOT set AWS_ACCESS_KEY_ID here.
```

### 6. Verify

```bash
node -e "
const { encryptInvoice, decryptInvoice } = require('./lib/crypto/invoiceEncryption');
const { AwsKmsClient } = require('./lib/crypto/kmsClients/aws');
const kms = new AwsKmsClient(process.env.AWS_KMS_KEK_ALIAS);
const env = await encryptInvoice(JSON.stringify({test:'ok'}), kms);
const back = await decryptInvoice(env, kms);
console.log('roundtrip ok:', back === JSON.stringify({test:'ok'}));
"
```

If this prints `roundtrip ok: true`, the wiring is correct.

---

## Option B: GCP KMS

### 1. Create the KEK

```bash
# Create a keyring
gcloud kms keyrings create vfide \
  --location global

# Create the key
gcloud kms keys create invoice-kek \
  --location global \
  --keyring vfide \
  --purpose encryption \
  --rotation-period 90d \
  --next-rotation-time "$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ)"
```

### 2. Service account permissions

```bash
gcloud kms keys add-iam-policy-binding invoice-kek \
  --location global \
  --keyring vfide \
  --member serviceAccount:<your-app-sa@your-project.iam.gserviceaccount.com> \
  --role roles/cloudkms.cryptoKeyEncrypterDecrypter
```

### 3. Configure the application

```bash
INVOICE_KMS_PROVIDER=gcp
GCP_KMS_KEY_RESOURCE=projects/<project>/locations/global/keyRings/vfide/cryptoKeys/invoice-kek
# Service account credentials provided by Workload Identity / GKE node identity.
```

GCP's automatic 90-day rotation will rotate the KEK transparently. Old wrapped DEKs continue to decrypt because GCP keeps prior versions.

---

## Option C: HashiCorp Vault

### 1. Enable the transit secrets engine

```bash
vault secrets enable transit
```

### 2. Create the KEK

```bash
vault write -f transit/keys/vfide-invoice-kek
```

### 3. Configure auto-rotation

```bash
vault write transit/keys/vfide-invoice-kek/config \
  auto_rotate_period=90d \
  deletion_allowed=false
```

`deletion_allowed=false` is critical. If the KEK is ever deleted while invoices encrypted with it still exist in the database, those invoices become permanently unrecoverable.

### 4. Create a policy and token for the app

`vfide-invoice-encryption.hcl`:
```hcl
path "transit/encrypt/vfide-invoice-kek" { capabilities = ["create", "update"] }
path "transit/decrypt/vfide-invoice-kek" { capabilities = ["create", "update"] }
```

```bash
vault policy write vfide-invoice-encryption vfide-invoice-encryption.hcl
vault token create -policy=vfide-invoice-encryption -ttl=8760h -renewable=true
```

### 5. Configure the application

```bash
INVOICE_KMS_PROVIDER=vault
VAULT_ADDR=https://vault.<your-domain>:8200
VAULT_TOKEN=<token-from-step-4>  # use Vault Agent for production, not direct token
VAULT_TRANSIT_KEY=vfide-invoice-kek
```

For production: do NOT set `VAULT_TOKEN` directly. Use Vault Agent with auto-auth (Kubernetes auth, AWS IAM auth, or AppRole) so tokens are short-lived and renewed automatically.

---

## Initial backfill (existing invoices)

After provisioning the KMS, existing plaintext invoices in the database need to be encrypted. The migration adds an `encrypted_envelope` column; the backfill script populates it.

```bash
# DRY RUN: show what would be encrypted
node scripts/encrypt-existing-invoices.ts --dry-run

# Apply: encrypt in batches of 100, with progress
node scripts/encrypt-existing-invoices.ts --apply

# Verify: random sample
node scripts/encrypt-existing-invoices.ts --verify
```

The script is idempotent — running it twice is safe. It only encrypts rows where `encrypted_envelope IS NULL`.

After the backfill is verified, schedule the plaintext column drop in the next migration window:

```sql
-- Once 100% of invoices have encrypted_envelope populated AND a deploy
-- cycle has passed where reads use the encrypted path:
ALTER TABLE invoices DROP COLUMN line_items;
ALTER TABLE invoices DROP COLUMN customer_email;
-- (etc. for all PII columns)
```

Don't drop too early. The encryption pathway needs a full deploy cycle of read-traffic verification before the plaintext is removed.

---

## Key rotation (annual)

KEK rotation does NOT require re-encrypting existing invoices. Each invoice's wrapped DEK was generated at write-time using the KEK version active at that moment; KMS decryption automatically uses the right KEK version.

What rotation IS:
- A new KEK version becomes the default for `wrap()` calls (new invoices use it)
- Old KEK versions remain available for `unwrap()` (old invoices still decrypt)

What rotation is NOT:
- A re-encryption sweep across the database
- A reason to take downtime
- Visible to the application code

If you need to rotate to a *new* KEK (e.g. after suspected compromise of the old one), that DOES require re-wrapping every DEK with the new KEK. Run:

```bash
node scripts/rewrap-invoice-deks.ts --old-kek <old-alias> --new-kek <new-alias> --apply
```

This script is shipped separately if/when needed. It's not in the v19.11 patch because the operational scenario (suspected KEK compromise) is rare enough that we'll write the script when we actually need it.

---

## Disaster recovery

What happens if the KMS goes down? Reads fail, writes fail. Both are bad, but they fail closed — no plaintext leaks.

What happens if the KEK is permanently lost (someone deletes the key in AWS, or the Vault server burns down without backups)? Every invoice currently in the database becomes unrecoverable. This is why:
- AWS KMS key deletion has a 7-30 day waiting period (configurable). Use 30.
- Vault keys are configured with `deletion_allowed=false` (step 3 above).
- GCP KMS keys cannot be deleted, only disabled (this is the default).

For HashiCorp Vault specifically, also configure backup of the transit secrets engine to a separate physical location. AWS and GCP handle this transparently.

---

## Audit log

Every KMS operation generates a CloudTrail / Cloud Audit Logs / Vault audit log entry. Periodically review:
- Number of `Encrypt` operations (should track invoice creation rate)
- Number of `Decrypt` operations (should track invoice read rate, or backfill periods)
- IAM/service-account identities (should be ONLY the application's runtime role)
- Anomalies: `Decrypt` from an unknown source, `Encrypt` from an admin user (should be zero), spikes outside business hours

Wire these into your existing security alerting. The KMS audit trail is one of your strongest signals if invoice data is ever exfiltrated.

---

## Failure modes and what to do

| Symptom | Cause | Action |
|---|---|---|
| `KMS access denied` errors on encrypt | IAM/service account permissions revoked | Re-bind the role to the policy in step 3 |
| `KMS access denied` errors on decrypt | Same | Same |
| `KMS rate limit exceeded` | Burst traffic exceeds account quota | Request quota increase OR add invoice-side caching of decrypted envelopes (in-memory only, never to disk) |
| `Auth tag verification failed` on decrypt | Envelope was tampered, OR KMS returned wrong key (e.g. wrong alias bound) | Verify alias points to the same KEK that was used to wrap. If yes, treat as a tampering incident. |
| `Unsupported envelope version` | Schema bumped without migration | Update `decryptInvoice` to handle the new version, or rewrap existing envelopes |
| Slow decryption | Synchronous KMS calls on every read | Cache decrypted envelopes in process memory with a short TTL (60s typical); never write decrypted data to disk |

---

## See also

- `lib/crypto/invoiceEncryption.ts` — the encryption module itself
- `scripts/encrypt-existing-invoices.ts` — one-time backfill
- `migrations/<timestamp>_invoices_envelope_encryption.up.sql` — schema migration
- `KEY_MANAGEMENT_PLAN.md` — overall key topology for the protocol
- `BACKUP_RESTORE_DRILL.md` — how invoice encryption interacts with backup/restore
