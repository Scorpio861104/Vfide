# v19.12 Rollup — Priority Apply Order

## Apply immediately (HIGH severity gaps in production code)

### 1. v19.10 BCOMPAT-3 — `window.ethereum` non-null assertion crashes

`lib/cryptoValidation.ts`

The pre-patch code uses `window.ethereum!.request(...)` in two places (`checkSufficientBalance`, `estimateGas`). In SSR, wallet-less browsers, and browsers where the wallet hasn't injected yet, this throws `TypeError: Cannot read properties of undefined`. The patch returns a structured `{sufficient:false, error:'No wallet detected'}` payload from the balance check, and falls through to a default 0.002 ETH estimate from the gas check.

**Verify after applying:** open the app in a browser with no wallet extension installed. The crypto-validation paths should produce structured "no wallet detected" errors instead of console crashes.

### 2. v19.7 XCHAIN-3 — explicit chain allowlist for SIWE challenges

`lib/security/siweChallenge.ts`, `app/api/auth/challenge/route.ts`

The pre-patch code matches the issued chainId against the response chainId — that prevents a stolen-then-replayed challenge from being valid on a DIFFERENT chain. But it does NOT prevent an attacker from requesting a challenge for `chainId=999` (a chain VFIDE doesn't support), signing it cheaply on that chain's testnet, and replaying it.

The patch adds an explicit allowlist sourced from `NEXT_PUBLIC_SUPPORTED_CHAIN_IDS` (with a safe default mainnet+testnet matrix). Challenges for unsupported chains are rejected at issue time.

**Verify after applying:** request a challenge with `chainId=999`. Should return HTTP 400 with `{"error":"Unsupported chain: 999"}`.

### 3. v19.9 RACE-2 — quest-claim FOR UPDATE on all 3 claim routes

`app/api/quests/claim/route.ts`, `app/api/quests/weekly/claim/route.ts`, `app/api/quests/achievements/claim/route.ts`

The pre-patch code does `BEGIN; SELECT ... WHERE claimed=false; UPDATE; COMMIT`. The SELECT does NOT lock the row, so two concurrent requests can both pass the `claimed=false` gate before either UPDATE commits. Result: double XP / double rewards.

The patch adds `FOR UPDATE OF <table>` to the SELECT so the second concurrent request waits on the row lock, AND adds `AND claimed = false` to the UPDATE's WHERE so the second path's UPDATE affects 0 rows (defensive idempotency). The route checks `rowCount === 0` and rolls back with a 409.

**Verify after applying:** simulate two concurrent claim requests for the same quest. Only one should succeed; the other gets "Quest already claimed".

## Apply before mainnet launch (correctness + observability)

### 4. v19.8 COMP-3 — audit log infrastructure

New: `lib/audit/auditLog.ts`, `migrations/20260509_create_audit_events.up.sql` + `.down.sql`
Modified: `app/api/privacy/delete/route.ts`

Compliance regimes (GDPR, financial regulators in the merchant payment space) require an audit trail for privileged actions. VFIDE didn't have one. This adds:
- An `audit_events` table (append-only by design)
- `writeAuditEvent()` / `queryAuditEvents()` API
- Standard event-type taxonomy for privacy deletions, admin role changes, etc.
- A first wired call site: privacy deletion request

Apply procedure:
```bash
npm run migrate:up   # creates the audit_events table
# Code uses it automatically; no further wiring needed for the existing privacy-delete path
```

Wire `writeAuditEvent` into other privileged paths as they're added (the PR template added in v19.11 has a checkbox for this).

## Apply before any social-channel marketing push

### 5. v19.10 BCOMPAT-1 — clipboard helper + 7 fan-outs

New: `lib/clipboardSafe.ts`
Modified: `components/ui/AddressDisplay.tsx`, `components/ui/EtherscanLink.tsx`, `components/payment-links/PaymentLinkGenerator.tsx`, `app/(commerce)/store/[slug]/components/ShareStoreSheet.tsx`, `app/(marketing)/s/[slug]/LinkInBioClient.tsx`, `app/checkout/[id]/page.tsx`, `app/merchant/gift-cards/page.tsx`

`navigator.clipboard.writeText()` throws DOMException silently in iOS in-app browsers (Twitter, Facebook, Instagram, WhatsApp, Telegram, Discord). The user clicks "Copy", sees no toast, nothing happens, retries, same result. High-impact UX failure for any user landing via shared links.

The helper tries the modern API, falls back to legacy `execCommand('copy')`, returns false if both fail (caller decides whether to surface a hint).

**Verify after applying:** test in Twitter's in-app browser specifically. Pre-patch: copy button does nothing. Post-patch: copy succeeds.

## Apply when convenient (UX, docs)

### 6. v19.9 MOB-1 — SetupStep mobile attrs

`components/merchant/SetupStepBusiness.tsx`, `components/merchant/SetupStepProducts.tsx`

Adds `autoComplete`, `autoCorrect`, `autoCapitalize`, `inputMode`, `min-h-[44px]` to merchant onboarding form inputs. Without these, iOS Safari auto-corrects "VFIDE Merchant" to "Vide Merchant" and tap targets are below the iOS recommended 44pt minimum.

### 7. v19.10 DOCS-1, DOCS-2, DOCS-3 — documentation gaps

Append-only additions to:
- `docs/ENV_CONTRACT_ADDRESS_MATRIX.md` (Multi-Chain Deployments section)
- `docs/DEPLOYMENT.md` (Deploying to Multiple Chains section)
- `README.md` (Fee Structure section)

These don't change runtime behavior. They prevent the next operator from mis-deploying multi-chain (DOCS-1, DOCS-2) and prevent partners/regulators from being told inaccurate information about fees (DOCS-3).

### 8. v19.10 REC-1 — SystemHandover runbook

New: `docs/operations/SYSTEM_HANDOVER_RUNBOOK.md`

Step-by-step procedure for the once-per-protocol-lifetime developer-key-burn event. 7 pre-execution criteria, execution steps, post-state verification, public attestation template, explicit rollback-impossibility warnings.

Most useful when actually planning the handover (~6 months post-launch). Apply now so it's in place when needed.

### 9. v19.10 I18N-2 — extract-i18n-keys script

New: `scripts/extract-i18n-keys.mjs`

Walks JSX, finds user-facing strings, filters out non-translatables (URLs, env vars, classNames, IDs, log messages), reports candidates without translation keys. Wire as informational CI step.

### 10. v19.3 OP-5 complement — standalone restore-test

New: `scripts/restore-test.sh`

`backup-db.sh` already has restore-test mode embedded (verifies the dump at backup time). This NEW script verifies an ARCHIVED backup is restorable — catching "a backup we made 30 days ago has bit-rotted on S3" or "the restore procedure works in cold-call drill conditions, not just in the warm cache of a fresh backup".

Schedule weekly cron. Page on failure.

## Validation across the rollup

After applying:
1. `npm run typecheck` — must pass
2. `npm run lint` — must pass
3. `npm run test` — must pass
4. Manual smoke tests per the README's Validation section

## What this rollup does NOT do

- Does not change behavior for v19.x items already correctly applied (XCHAIN-1, COMP-2, OP-2, OP-4, etc.)
- Does not modify any contract code (all v19.4 economic-actor items already in place)
- Does not modify any v19.11 carry-forward code (already complete)
- Does not modify translations (already complete in v19.11)

## Operator-action items — same as after v19.11

- **KMS provisioning** for COMP-4 envelope encryption — operator picks AWS / GCP / Vault and follows `docs/operations/INVOICE_ENCRYPTION_KMS_SETUP.md`
- **System handover execution** — operator runs `docs/operations/SYSTEM_HANDOVER_RUNBOOK.md` ~6 months post-launch

The hard part is done.
