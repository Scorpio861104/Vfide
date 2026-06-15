# Ownership ↔ Commerce Boundary — Audit Campaign

**Status: REQUIRED · Priority: CRITICAL · Platform certification gate.**

VFIDE's entire thesis is **Ownership Protected → Commerce Enabled**. The boundary between those two — how a vault
(ownership) relates to spending and merchant settlement — is the load-bearing architectural seam of the whole
ecosystem. If it is wrong or partially implemented, it affects ownership, recovery, commerce, merchant operations,
inheritance, continuity, and security *simultaneously*. This campaign certifies that boundary end-to-end under the
same find→fix→retest→re-audit discipline as the Continuity campaign. **Final platform certification is blocked
until this campaign is complete.**

This campaign runs AFTER the ACTIVE Continuity capability audits (Audits 1–4, complete).

## The 8 capabilities
1. **Vault Funding** — assets enter the vault correctly and remain owned by the vault.
2. **Vault → Wallet Transfer** — transfer rules, permissions, limits, logging, notifications; who can trigger.
3. **Wallet Spending** — merchant payments, peer transfers, commerce purchases, escrow funding.
4. **Debit-Card Model Verification** — is it truly Vault=Ownership / Wallet=Spending, or has the wallet become a
   second ownership layer?
5. **Spending Controls** — daily limits, transaction limits, allowances, merchant restrictions, risk controls.
6. **Wallet Compromise Scenario Matrix** — stolen phone, malware, key compromise, SIM swap, device theft: what is
   exposed, what stays protected, can the vault remain safe.
7. **Continuity Interaction** — inheritance of vault vs wallet assets, recovery interaction, proof-of-life.
8. **Merchant Settlement Flow** — trace the ACTUAL path (Vault→Wallet→Merchant? Vault→Merchant? Wallet→Merchant?).

## New certification gate: **Ownership-Commerce Boundary**
Added to the platform certification checklist (Capability Registry + Systems Tracker). No final platform
certification without proving exactly how vaults, wallets, merchants, recovery, inheritance, and spending interact
end-to-end.

---

# Audit 1 — Foundational Architecture (Capabilities 4 & 8, touching 2/5/6/7)

**Method:** traced the ACTUAL implementation in `CardBoundVault.sol` (`executePayMerchant`,
`executeVaultToVaultTransfer`, `executeFundEscrow`) + `CardBoundVaultPaymentQueueManager.sol` —
**no assumptions.** Built `lib/audit/ownershipCommerceBoundaryModel.ts` + `__tests__/audit/
ownershipCommerceBoundary.test.ts` (**21 scenarios; all pass; typecheck 0; full audit suite 546/21 green**).

## GROUND TRUTH (traced, not assumed)
The architecture is a **true debit-card model**, and one of the campaign's assumptions needed correcting:

- **The VAULT is the sole asset store (ownership).** Protocol funds only ever live in the `CardBoundVault`.
- **The `activeWallet` is a SPENDING AUTHORITY (signing key), NOT a second ownership layer.** A grep for any path
  moving funds *into* the wallet returns nothing — the wallet never holds protocol funds. It only *signs* intents
  (`signer != activeWallet` → revert). **(Capability 4: ANSWERED — wallet is spending authority, not ownership.)**
- **Settlement is DIRECT FROM VAULT.** `executePayMerchant` ends in `safeTransfer(intent.recipient, amount)` —
  funds move **vault → merchant recipient** directly (mediated by the merchant portal as caller). Peer transfers
  go **vault → registered vault** directly. There is **no wallet hop**.
  **(Capability 8: ANSWERED — the path is `Vault → Merchant`, NOT `Vault → Wallet → Merchant`.** The assumed
  three-hop model in the campaign brief is architecturally incorrect; corrected here against source.)

```
ASSUMED (campaign brief):   Vault → Wallet → Merchant
ACTUAL (traced):            Vault ──(activeWallet signs the intent)──▶ Merchant
                            (no intermediate wallet balance exists)
```

## Verified properties
- **Capability 5 (spending controls) — present and enforced:** per-transaction cap (`maxPerTransfer`), daily cap
  (`dailyTransferLimit`, fixed 24h window), **large-payment queueing** (`largePaymentThreshold` → delayed +
  cancellable), sequential nonce, chain binding, deadline, VFIDE-only token, merchant-portal mediation, Seer risk
  enforcement, and recipient-codehash pinning on queued payments. Queued payments are cancellable by **admin OR a
  guardian** (OC5-01..05).
- **Capability 6 (wallet compromise) — bounded + recoverable (the debit-card security guarantee):** a stolen
  wallet key cannot drain the vault in one tx (per-tx cap, OC6-01), is capped at the daily limit per day
  (OC6-02), cannot change admin or seize the vault (OC6-05). Recovery rotates the wallet → **walletEpoch bump
  invalidates the attacker's pre-signed intents** (OC6-03) **AND `clearOnRecovery` voids any queued payment**
  (OC6-04). Net blast radius of a spending-key compromise: at most `dailyTransferLimit`/day until recovery;
  ownership is never lost.
- **Capability 7 (continuity interaction) — verified at this layer:** `executeRecoveryRotation` bumps the epoch,
  clears the payment + withdrawal queues, and cancels any active inheritance claim — a single coherent
  recovery that severs a compromised spending key from both live spending and queued spending.

## Findings
**No critical/high findings in the foundational architecture — the boundary is sound and correctly implemented.**
The most important deliverable is the architectural certification + the correction of the assumed settlement path.

Deliberate, bounded design tradeoffs (documented, not defects):
- **Fixed 24h daily window:** a boundary-straddling spender could spend up to `dailyTransferLimit` twice across a
  window edge. Bounded, owner-configured; a sliding window would be stricter (defense-in-depth note).
- **Large-payment queue is opt-in (`largePaymentThreshold > 0`):** if unset, large payments are instant but still
  bounded by per-tx + daily caps. The queue is an *additional* protection; a sensible default is a UX/roadmap item.
- **Pre-guardian payment allowance (GUARDIAN-WARN-1):** new users can pay before configuring guardians (warn,
  don't block — protects the "tap to pay" flow), with incoming funds capped at `MAX_VFIDE_WITHOUT_GUARDIAN` (50K).

## Registry impact
The new **Ownership-Commerce Boundary** rows enter the registry at evidenced stages **1/6/10/11/12/13** (source
traced, permissions, edge matrix, adversarial, cross-system recovery interaction, grandmother property: a lost
spending key never costs the user their vault). **Stage 2 remains `~` (compiled bytecode pending).** The gate is
added to the Systems Tracker and platform certification checklist.

## Remaining campaign work (subsequent audits)
- **Cap 1** Vault Funding (asset-entry paths, ownership retention).
- **Cap 2** Vault→Wallet Transfer authority — *note: re-scoped, since no wallet balance exists; this becomes the
  full who-can-trigger-spend authority matrix (attacker/guardian/DAO cannot trigger; only the activeWallet sig).*
- **Cap 3** Wallet Spending types in depth (peer, escrow, subscription, commerce purchase).
- **Cap 5** Spending Controls completeness (merchant restrictions / allowances if present; roadmap if missing).
- **Cap 6** Full wallet-compromise matrix (SIM swap, malware, device theft variants) end-to-end.
- **Cap 7** Continuity interaction in depth (inheritance of vault assets; there are no separate wallet assets to
  inherit — itself a finding to certify).

---

# Audit 2 — Vault Funding & Ownership Retention (Capability 1)

**Method:** traced the ACTUAL funding + exit paths in `CardBoundVault.sol` (canReceiveTransfer, the rescue
functions) + `CardBoundVaultAdminFacet.sol` + `VFIDEToken.sol` — no assumptions. Built
`lib/audit/vaultFundingModel.ts` + `__tests__/audit/vaultFunding.test.ts` (**12 scenarios; all pass; typecheck 0;
full audit suite 558/22 green**).

## Ground truth — how assets ENTER
- **No `deposit()` function.** Assets enter as a plain ERC20 balance transferred to the vault address; the vault's
  VFIDE `balanceOf` IS its assets (FUND-01).
- **`canReceiveTransfer`** caps incoming **vault-to-vault** transfers at `MAX_VFIDE_WITHOUT_GUARDIAN` (50K) until
  guardian setup completes, then is unrestricted (FUND-02/03). Purpose: limit at-risk balance for a vault not yet
  protected by guardians.

## Ground truth — assets REMAIN owned by the vault (the non-custodial exit invariant)
VFIDE leaves the vault by **exactly** these owner-controlled paths — and no others:
1. the signed-intent system (`executePayMerchant` / `executeVaultToVaultTransfer` / `executeFundEscrow`),
   bounded by per-tx + daily limits, queued for large amounts, guardian-cancellable, activeWallet-signed;
2. the owner withdrawal queue;
3. inheritance heir payout (owner-vetoable).

**`rescueERC20` DOUBLE-GUARDS against VFIDE** — `if (token == _vfideToken()) revert CBV_CannotRescueVFIDE()` at
BOTH propose and apply time (OWN-01/03). The contract's own comment names the exact threat it kills: a compromised
admin doing `rescueERC20(vfideToken, attacker, fullBalance)` to bypass every limit, the queue, the signature, AND
the guardian veto. The guard is unconditional — even a compromised admin key cannot stage it (OWN-02). Stray-token
and native (ETH) rescue are timelocked (7-day `SENSITIVE_ADMIN_DELAY`) and **guardian-cancellable** (STRAY-01/02/03).
Net: **funds in the vault cannot be seized or frozen; ownership is retained** (NC-01).

## Finding

### Observation (LOW, comment clarified) — the 50K receive cap is a vault-to-vault SOFT cap, not a hard cap
**Root cause:** `canReceiveTransfer` is a view called only by a *sending* vault on the vault-to-vault path. VFIDE
is a plain ERC20 with no receiver hook (`VFIDEToken.transfer` just calls `_transfer`), so a **raw ERC20 transfer**
to a guardian-less vault is NOT gated by the cap and can exceed 50K (FUND-04). The GUARDIAN-WARN-1 comment implied
the cap bounds *all* incoming, which a frontend/indexer (per that comment's own MUST-track instruction) could rely
on. **Not a vulnerability:** capping plain-ERC20 receipt is impossible without a token hook, and the binding
pre-guardian loss bound is the **daily/per-tx spend limit** (a stolen key still can't out-spend the limits),
not the 50K cap. **Fix:** comment clarified to state the cap is enforced on vault-to-vault transfers only, raw
transfers are not interceptable, and the daily/per-tx limit is the binding bound during the pre-guardian window.

## Registry impact
**Vault Funding (Cap 1)** advances to evidenced stages **1/6/10/11/12/13** (source traced, permissions, edge
matrix, adversarial, cross-system: funding↔non-custodial-exit, grandmother property: money put into the vault
stays the user's and can't be confiscated). **Stage 2 remains `~`.**

---

# Audit 3 — Spend Authority & Spending Types (Capabilities 2 & 3)

**Method:** traced every path VFIDE can leave a vault — `executePayMerchant` / `executeVaultToVaultTransfer` /
`executeFundEscrow` / `queueWithdrawal` (CardBoundVault), `approveVFIDE` (AdminFacet), and `processPayment`
(SubscriptionManager) — no assumptions. Built `lib/audit/spendingChannelsModel.ts` +
`__tests__/audit/spendingChannels.test.ts` (**22 scenarios; all pass; typecheck 0; full audit suite 580/23 green**).

## THE headline — there are TWO spending channels with DIFFERENT authority + control models
This is the most important architectural fact in the commerce layer, and it must be stated plainly (Veritas Law):

**Channel 1 — DIRECT SPEND** (merchant pay / peer transfer / escrow fund):
- **Authority (Cap 2):** ONLY a valid `activeWallet` SIGNATURE. The submitter (merchant portal, escrow contract)
  is just a relay — the binding check is `signer == activeWallet`. **Not** admin, **not** guardian, **not** DAO,
  **not** an attacker, **not** the portal itself (AUTH-01..05, verified for every non-wallet caller).
- **Controls (Cap 5):** per-tx cap, daily cap, walletEpoch binding, sequential nonce, Seer enforcement.
- **Recovery:** severs it — walletEpoch bump invalidates pre-signed intents; `clearOnRecovery` voids the queue.

**Channel 2 — SUBSCRIPTION PULL** (recurring commerce, `processPayment` → `transferFrom`):
- **Authority (Cap 2):** an ERC20 **allowance** set by `approveVFIDE` (**admin-only, 7-day timelock,
  guardian-cancellable** — SUB-07), then pulled by `processPayment`, triggerable by the merchant during an
  exclusive window, then merchant/subscriber/DAO (SUB-01/02). An attacker cannot trigger or establish it.
- **Controls:** allowance cap + fixed `sub.amount` per `interval` + vault-mapping pinning + grace/auto-cancel
  (SUB-03..06). It **deliberately does NOT enforce the vault's per-tx/daily caps or walletEpoch** — recurring
  automation cannot demand a fresh signature each cycle, so the allowance + per-subscription bounds are the
  appropriate control surface for this channel.

> **Critical clarification:** the vault's daily/per-tx limits govern the DIRECT channel only. They do **not** cap
> subscription pulls. A surface that implies "the daily limit caps all outflows" would be wrong — subscription
> outflow is bounded by the allowance and the agreed per-subscription amount/interval instead.

## Finding

### Finding (MEDIUM, documented — not auto-fixed) — recovery severs the direct channel but not subscription allowances

> **⚠ CORRECTED BY CAMPAIGN C (Ownership Identity Architecture):** the reasoning below conflated a *legitimate
> wallet rotation* (leaves `vaultOf` intact) with *recovery* (executes `vaultOf[oldOwner]=0`). Recovery DOES sever
> subscriptions — the pull then reverts "no user vault". Severity downgraded MEDIUM→LOW; residual = allowance
> hygiene only (the new owner should revoke the `approveVFIDE` allowance). See
> `OWNERSHIP_IDENTITY_ARCHITECTURE_AUDIT.md`.
**Root cause:** recovery (`executeRecoveryRotation`) bumps `walletEpoch` and clears the payment/withdrawal queues
— severing Channel 1 — but does **not** revoke ERC20 allowances. `vaultOf` is keyed by the owner and is unchanged
by a wallet rotation, so the subscription vault-pinning does not auto-trigger either, and `processPayment`'s
`transferFrom` path never checks `walletEpoch`. So a subscription + allowance established before a compromise can
continue to pull (bounded by `sub.amount`/`interval`) after recovery, until the recovered owner revokes the
allowance or cancels the subscription.
**Severity reasoning:** MEDIUM. **Primary protection holds** (REC-03): the allowance can only be established by an
admin action behind a 7-day, guardian-cancellable timelock — there is no silent path for an attacker to create
it, and the per-cycle pull is the agreed amount, not arbitrary. The gap is a defense-in-depth inconsistency
(recovery doesn't sever ALL channels the old key set up), not a silent-drain vulnerability.
**Why NOT auto-fixed:** the obvious fix — binding subscriptions to `walletEpoch` so recovery invalidates them —
was **rejected** because it would also break subscriptions on every *legitimate* wallet rotation, which is worse
for the user. Distinguishing "recovery" from "legitimate rotation" needs context the SubscriptionManager doesn't
have. **Appropriate remediation:** (1) operational — the recovery UX should prompt the recovered owner to review
+ revoke outstanding allowances and cancel subscriptions; (2) a team design decision on whether recovery should
revoke allowances to *known* protocol spenders (e.g. the SubscriptionManager) given its address is configurable.
Documented here so the gap is explicit rather than an unstated assumption.

## Registry impact
**Spend Authority — who can trigger (Cap 2)** and **Wallet Spending Types (Cap 3)** advance to evidenced stages
**1/6/10/11/12/13** (source traced, permissions/authority matrix, edge matrix, adversarial, cross-system: the
two-channel + recovery interaction, grandmother property: nobody but the owner's signing key can spend on the
direct channel, and recurring pulls are bounded + opt-in). **Stage 2 remains `~`.** The recovery↔subscription gap
is logged as a MEDIUM finding with documented remediation, not a blocking defect.

---

# Audit 4 — Wallet Compromise Scenario Matrix (Capability 6)

**Method:** traced the key model + recovery flow in `CardBoundVault.sol` (proposeWalletRotation/finalizeWalletRotation,
cancelRecoveryRotation, setSpendLimits) and `VaultHub.sol` (executeRecoveryRotation, abortRecoveryRotation, the
72h challenge) — no assumptions. Built `lib/audit/walletCompromiseModel.ts` +
`__tests__/audit/walletCompromise.test.ts` (**29 scenarios; all pass; typecheck 0; full audit suite 609/24 green**).

## Ground truth — THREE keys, not one
The compromise matrix decomposes cleanly because VFIDE separates three roles (equal at vault creation, divergent
once the user separates them):
- **`activeWallet`** — HOT spending key; signs direct-spend intents; rotatable.
- **`admin`** — config key; proposes guardian/limit/PoL/rescue changes, ALL timelocked + guardian-cancellable.
- **`ownerOfVault`** (hub) — account-identity anchor; gates `abortRecoveryRotation`; changes ONLY via recovery.
`__forceSetOwner` was removed: *no external entity can reassign vault ownership* — recovery is only via the user's
own guardians.

## Scenario matrix (what is exposed / protected / recoverable)

| Vector | On-chain keys compromised | Exposed | Protected | Recoverable |
|---|---|---|---|---|
| **SIM swap** | NONE | nothing — no contract has phone-number authority | everything | yes |
| **Wallet key (hot)** | activeWallet | bounded direct spend ≤ daily limit/day | limits (7d), VFIDE (rescue-blocked), config (admin separate), ownership | yes (separated) |
| **Malware** | activeWallet (+ tricked signatures, still limit-bounded) | bounded direct spend | same as above | yes (separated) |
| **Stolen phone / device theft — keys SEPARATED** | activeWallet only | bounded direct spend | admin + identity keys safe | yes |
| **Stolen phone / device theft — UNSEPARATED (default)** | all three | bounded direct spend | still cannot raise limits / drain VFIDE / change config instantly / seize | tension — see finding |

**Universal guarantees (hold under EVERY compromise, UNIV-01..04):** limits can never be raised instantly
(7d timelock); VFIDE can never be drained via rescue (double-guard); config can never change instantly
(timelocked + guardian-cancellable); vault ownership can never be seized. So **no compromise grants escalation** —
the worst case is bounded spend at the existing daily limit until recovery.

## Finding

### Finding (MEDIUM, documented — not auto-fixed) — recovery-abort griefing in the UNSEPARATED key posture
**Root cause:** `abortRecoveryRotation` is gated to `ownerOfVault[vault]` (the account-identity key) and exists so
a LIVING owner can stop a wrongful guardian recovery during the 72h challenge (the sovereignty mirror of
inheritance `ownerOverrideClaim`). Each abort bumps `recoveryNonce`, invalidating collected approvals. In the
**unseparated default** — where, at vault creation, `ownerOfVault == admin == activeWallet` — a compromise of that
single key lets the attacker repeatedly abort guardian recovery (cheap abort per cycle vs guardians re-collecting
M-of-N + waiting another 72h each time), an asymmetric griefing deadlock that can block recovery (ABORT-02).
**Severity reasoning:** MEDIUM. Blast radius stays bounded throughout — the attacker cannot raise limits (7d),
drain VFIDE (rescue-blocked), change config (timelocked), or seize ownership; the worst case is continued spend at
the daily limit. And the architecture ALREADY contains the mitigation: **separating the hot spending key from the
account-identity key closes the attack entirely** (ABORT-01/03) — a separated hot-key compromise cannot abort
recovery and is fully recoverable.
**Why NOT auto-fixed:** the abort is a deliberate owner-sovereignty guarantee; removing or re-gating it is a design
decision with real tradeoffs (it protects legitimate owners from guardian collusion). **Recommended remediation:**
(1) product/UX — make key separation the default onboarding path and surface the unseparated posture as a security
warning (the RecoveryAdminSeparated machinery already supports re-separation); (2) optional protocol enhancement —
a guardian-supermajority force-recovery escalation after N aborts, or gating the abort to a key distinct from the
one being rotated. Documented so the tension is explicit rather than an unstated assumption.

## Registry impact
**Wallet-Compromise Matrix (Cap 6)** advances to evidenced stages **1/6/10/11/12/13** (source traced, key/role
permissions, full scenario edge matrix, adversarial per-vector, cross-system: compromise↔recovery↔limits,
grandmother property: losing your phone never costs you the vault and never lets a thief raise your limits or seize
your money). **Stage 2 remains `~`.** The recovery-abort griefing is a MEDIUM finding with a mitigation that
already exists (key separation) plus documented enhancement options.

---

# Audit 5 — Continuity ↔ Commerce Interaction (Capability 7) — CAMPAIGN CAPSTONE

**Method:** traced the seam between continuity and commerce — `_requireOperationalForOutboundTransfers` /
`withdrawFinalHeirPayout` / `executeRecoveryRotation` (CardBoundVault), `initiateInheritanceClaim` /
`cancelClaimForRecovery` (InheritanceManager), and `processPayment` / `settleByInheritance` (SubscriptionManager) —
no assumptions. Built `lib/audit/continuityCommerceModel.ts` + `__tests__/audit/continuityCommerce.test.ts`
(**15 scenarios; all pass; typecheck 0; full audit suite 624/25 green**).

## The four sub-items, answered

**1. Inheritance of vault assets ✓** — heir payout (`consumeHeirPayout` → `safeTransfer(heirVault, amount)`) draws
entirely from the VAULT's VFIDE balance, distributed proportionally (certified in the Continuity campaign). INH-01.

**2. Inheritance of wallet assets ✓ (there are none)** — the `activeWallet` holds no protocol funds (OC Audit 1),
so there are no separate "wallet assets" to inherit. Everything inheritable lives in the vault. This corrects the
intuitive assumption that a wallet holds a balance that would need separate inheritance handling.

**3. Recovery interaction ✓** — recovery cancels the inheritance claim (`cancelClaimForRecovery`), pauses/resumes
the inheritance timers, clears the direct payment/withdrawal queues, and bumps `walletEpoch`; inheritance cannot be
initiated while a recovery is pending (`INH_RecoveryInProgress`). REC-01. (The recovery-abort tension from OC Audit
4 lives here too.)

**4. Proof-of-Life interaction ✓** — VFIDE proof-of-life is **reactive, not a heartbeat**: a guardian (not the DAO
guardian, per Decision 12) initiates a claim at any time — **no inactivity requirement** — and the owner vetoes
within the veto window (POL-01/02/03). **Spending does NOT refresh proof-of-life** (`_logPayment` only writes a
ledger event) — POL-04. This is *safer* than a deadman's switch (no false inheritance from a missed heartbeat),
but it means active vault use is not itself the inheritance protection — guardian trust + the veto window is. That
should be communicated clearly (Veritas Law): never imply that simply using the vault holds inheritance at bay.

## The unifying finding — continuity freezes govern the DIRECT channel fully, the SUBSCRIPTION channel partially

### Finding (LOW-MEDIUM, documented) — subscriptions escape the continuity freezes that bind direct spending
**Root cause / behavior:** the inheritance freeze (`_requireOperationalForOutboundTransfers` → `CBV_InheritanceActive`)
blocks DIRECT spends the instant a claim begins (FREEZE-02), but the SUBSCRIPTION pull path (`processPayment` →
`transferFrom`) does not consult the vault's inheritance state, so subscriptions continue to draw `sub.amount` per
interval through the VETO and CLAIM windows (SUBC-01). `settleByInheritance` can cancel a subscription only once a
party reaches MEMORIAL (SUBC-02) — i.e. after the full veto + claim period. This mirrors the OC Audit 3 result that
recovery does not revoke subscription allowances (REC-02): **the subscription channel consistently escapes both
continuity freezes.**
**Severity reasoning:** LOW-MEDIUM. The pull is the owner's own pre-authorized, fixed amount (not an attacker's),
bounded by the allowance and `sub.amount × cycles` over the claim window, and reduces — but does not zero — the
heirs' inheritance. There is also a **defensible rationale** for not cancelling earlier: during VETO the owner may
still be alive and may veto a wrongful claim; unilaterally cancelling their subscriptions at that point would harm
a living owner. So MEMORIAL-only settlement is a principled (if asymmetric) choice.
**Recommended remediation (team design decision, not auto-fixed):** (1) allow `settleByInheritance` (or an
authorized pause) during CLAIM_WINDOW once the veto period has elapsed, so heirs can stop ongoing pulls ~90 days
sooner; (2) surface to heirs that pre-authorized subscriptions continue to draw during a claim; (3) the recovery UX
should prompt allowance review (carried from OC Audit 3). Documented so the asymmetry is explicit, consistent with
the campaign's treatment of the subscription channel as a deliberately distinct, self-bounded spending surface.

## Registry impact
**Continuity ↔ Commerce Interaction (Cap 7)** advances to evidenced stages **1/6/10/11/12/13** (source traced,
permissions, full edge matrix across inheritance states, adversarial, cross-system: the inheritance/recovery/PoL ↔
two-channel seam, grandmother property: when you die your heirs receive what is in your vault, and a lost key
during a claim cannot be exploited to seize it). **Stage 2 remains `~`.**

---

# CAMPAIGN STATUS — Ownership ↔ Commerce Boundary gate

**All 8 capabilities certified at the source+model level (stages 1/6/10/11/12/13; stage 2 `~` pending bytecode).**

| Cap | Capability | Audit | Result |
|---|---|---|---|
| 4 | Debit-Card Model (ownership/spending separation) | 1 | Wallet = spending authority, NOT a second ownership layer |
| 8 | Merchant Settlement Flow | 1 | DIRECT vault→merchant; no wallet hop |
| 1 | Vault Funding | 2 | ERC20-in; rescue cannot touch VFIDE; ownership retained |
| 2 | Spend Authority (who can trigger) | 3 | Direct spend = activeWallet signature ONLY |
| 3 | Wallet Spending Types | 3 | Two channels: direct signed + subscription allowance-pull |
| 5 | Spending Controls | 1+3 | per-tx/daily/queue/Seer (direct); allowance/amount/interval (sub) |
| 6 | Wallet Compromise Matrix | 4 | 3-key model; no compromise escalates; recovery-abort tension |
| 7 | Continuity Interaction | 5 | Vault assets inherited; freezes bind direct fully, subscription partially |

**Findings ledger (all documented; none blocking; consistent theme):**
- OC-3 (LOW, corrected by Campaign C): recovery DOES sever subscriptions (vaultOf clear → pull reverts); residual = allowance hygiene.
- OC-4 (MEDIUM): recovery-abort griefing in the unseparated key posture (mitigated by key separation).
- OC-5 (LOW-MEDIUM): subscriptions continue through inheritance VETO/CLAIM (settle at MEMORIAL).
- Plus two LOW comment/documentation clarifications (OC-1 funding soft-cap; the two-channel control surface).

**Throughline:** the DIRECT spending channel is comprehensively governed — activeWallet-signature-only, bounded by
limits, frozen by inheritance, severed by recovery, non-seizable. The SUBSCRIPTION channel is a deliberately
distinct, self-bounded surface (allowance + amount + interval + vault-pinning) that escapes the vault's velocity
limits and the continuity freezes — appropriate for pre-authorized recurring commerce, but it must be documented as
such (done) and the team should decide on the optional earlier-cancellation enhancements.

**GATE STATUS: GREEN — pending stage-2 (compiled bytecode verification via `ONCHAIN_VERIFICATION_MANIFEST.md`).**
The Ownership ↔ Commerce Boundary is proven sound at the source+model level. The one action that flips every
stage-2 `~` to `Y` across this campaign (and all others) is running the compiled hardhat harness in a solc-0.8.30
environment.
