# Ownership ↔ Commerce Boundary — Gate Certification: Executive Summary

**Gate:** Ownership ↔ Commerce Boundary · **Priority:** CRITICAL · **Status: 🟢 GREEN — pending stage-2 (compiled
bytecode).** · **Detailed log:** `OWNERSHIP_COMMERCE_BOUNDARY_AUDIT.md`

This is the consolidated record for the platform-certification gate that proves how vaults, the spending wallet,
merchants, recovery, inheritance, and spending interact end-to-end. VFIDE's thesis is *Ownership Protected →
Commerce Enabled*; this gate certifies the seam between those two. Final platform certification is blocked until
this gate is GREEN; it is now GREEN at the source+model level, with compiled-bytecode confirmation (stage 2) the one
remaining step.

---

## 1. What the campaign proved (ground truth, traced from source — no assumptions)

Three architectural facts were established by reading the implementation, and two of them corrected intuitive
assumptions in the original brief:

1. **The vault is the sole asset store; the wallet is a spending authority, NOT a second ownership layer.**
   Protocol funds only ever live in the `CardBoundVault`. The `activeWallet` *signs* spend intents and never holds
   funds (a grep for any path crediting the wallet is empty). The debit-card model is real.

2. **Merchant settlement is DIRECT vault → merchant — there is no wallet hop.** `executePayMerchant` ends in
   `safeTransfer(intent.recipient, amount)`. The assumed `Vault → Wallet → Merchant` three-hop does not exist;
   this is a simpler, safer design (no intermediate balance to attack).

3. **There are TWO spending channels with different authority + control models.** This was the campaign's most
   consequential finding and had never been documented:
   - **Direct channel** (merchant / peer / escrow): authorized ONLY by the `activeWallet` signature; bounded by
     per-tx + daily limits, walletEpoch, nonce, Seer; frozen by inheritance; severed by recovery.
   - **Subscription channel** (`processPayment` → `transferFrom`): an allowance-based pull (allowance set by
     `approveVFIDE`, admin-only + 7-day timelock + guardian-cancellable), bounded by allowance + fixed amount +
     interval + vault-pinning. It deliberately bypasses the vault's velocity limits and escapes the continuity
     freezes — appropriate for recurring commerce, but it must be (and now is) documented as a distinct surface.

---

## 2. Capability certification matrix (all 8 — source+model level)

| Cap | Capability | Audit | Certified result |
|---|---|---|---|
| 1 | Vault Funding | 2 | ERC20-in (no deposit fn); `rescueERC20` double-guards VFIDE → ownership retained |
| 2 | Spend Authority (who can trigger) | 3 | Direct spend = `activeWallet` signature ONLY (not admin/guardian/DAO/attacker/portal) |
| 3 | Wallet Spending Types | 3 | Two channels: direct signed + subscription allowance-pull |
| 4 | Debit-Card Model | 1 | Wallet = spending authority, NOT a second ownership layer |
| 5 | Spending Controls | 1 + 3 | per-tx / daily / large-payment queue / Seer (direct); allowance / amount / interval (sub) |
| 6 | Wallet-Compromise Matrix | 4 | 3-key model; no compromise escalates; SIM swap compromises nothing on-chain |
| 7 | Continuity Interaction | 5 | Vault assets inherited (no wallet assets); freezes bind direct fully, subscription partially |
| 8 | Merchant Settlement Flow | 1 | DIRECT vault → merchant; no wallet hop |

All rows at evidenced stages **1 / 6 / 10 / 11 / 12 / 13** (source-correct, permissions/authority, edge matrix,
adversarial, cross-system, grandmother). **Stage 2 (`~`) = compiled bytecode, pending.** Full-stack stages 3–5 /
7–9 (`.`) are not in scope for a source+model audit.

---

## 3. Universal security guarantees (hold under every path tested)

- **No compromise grants escalation.** Spend limits can never be raised instantly (7-day timelock on
  `setSpendLimits`); VFIDE can never be drained via rescue (double-guard at propose + apply); config can never
  change instantly (all admin changes timelocked + guardian-cancellable); vault ownership can never be seized
  (`__forceSetOwner` removed).
- **The hot spending key is blast-radius-bounded** — worst case is spend at the existing daily limit until
  recovery, never the whole vault.
- **Recovery works** — a guardian-driven 72h-challenge rotation severs the direct channel (epoch bump + queue
  clear) and cancels any inheritance claim; key separation closes the one griefing edge.
- **Inheritance distributes vault assets** to heirs proportionally; there are no wallet assets to inherit.
- **Proof-of-life is reactive (guardian-initiated + owner veto), not a deadman's-switch** — no false inheritance
  from a missed heartbeat.

---

## 4. Findings ledger (all documented; none blocking certification)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| OC-3 | LOW (was MEDIUM — **corrected by Campaign C**) | Recovery DOES sever subscriptions (via `vaultOf[oldOwner]=0` → pull reverts "no user vault"); only the allowance persists | Corrected: the earlier "recovery doesn't sever subscriptions" conflated legitimate rotation with recovery. Residual = allowance hygiene (new owner revokes). See `OWNERSHIP_IDENTITY_ARCHITECTURE_AUDIT.md` |
| OC-4 | MEDIUM | Recovery-abort griefing in the UNSEPARATED key posture | Documented; already mitigated by key separation (which the architecture supports); optional enhancement = force-recovery escalation |
| OC-5 | LOW-MED | Subscriptions continue through inheritance VETO/CLAIM, settle at MEMORIAL | Documented; defensible (owner may veto during VETO); enhancement = allow settlement during CLAIM after veto elapses |
| OC-1 | LOW | 50K receive cap is a vault-to-vault SOFT cap (raw ERC20 not interceptable) | **Comment clarified in source**; daily spend limit is the binding pre-guardian bound |
| OC-2 | LOW | Two-channel control surface was undocumented | **Documented**; the vault daily limit governs direct only, not subscription pulls |

**Consistent theme:** the direct channel is comprehensively governed; the subscription channel is a deliberately
distinct, self-bounded surface that escapes the vault's velocity limits and the continuity freezes. Every gap above
traces to that one architectural fact, which is now explicit, tested, and flagged for the team's enhancement
decisions. No critical or high findings were produced; no manufactured fixes were applied where the appropriate
remediation is a design decision.

---

## 5. Evidence & test accounting

- **5 audits**, models in `lib/audit/` (ownershipCommerceBoundary, vaultFunding, spendingChannels,
  walletCompromise, continuityCommerce), matrices in `__tests__/audit/`.
- **99 Ownership↔Commerce scenarios**: 21 + 12 + 22 + 29 + 15. All passing.
- **Whole audit suite: 624 tests / 25 suites green; project typecheck 0 errors** (includes the 4 Continuity-campaign
  matrices and the core-ownership invariants).
- All fixes (continuity contract fixes, the OC-1 funding-comment clarification) are baked directly into the repo
  source — no separate patch files.

**Nature of the evidence (honest boundary):** these are executable LOGIC/MODEL matrices (pure-TS mirrors of the
Solidity, run under jest) — they prove the *logic and adversarial coverage*, not the compiled bytecode. The Solidity
cannot be compiled in the audit sandbox (solc download + local RPC blocked).

---

## 6. The one remaining step

**Stage 2 — compiled-bytecode verification.** Running the compiled contracts through the hardhat harness in a
solc-0.8.30 environment (walked by `ONCHAIN_VERIFICATION_MANIFEST.md`) flips every stage-2 `~` to `Y` across this
gate and all prior campaigns. After that, a professional third-party audit. All contract-level changes are
structurally sound source pending that compile-confirmation.

**Gate verdict:** the Ownership ↔ Commerce Boundary is proven sound at the source+model level and is **GREEN for
final platform certification once stage-2 completes.**
