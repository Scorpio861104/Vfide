# Wave 91 — Preparedness Civilization Audit

The capstone. Not "is each institution complete?" (Waves 85–89 settled that) but "do Ownership, Recovery,
Wallet Rotation, Guardians, Continuity, Heirs/Inheritance, Proof-of-Life, and Business Continuity operate as
**one preparedness organism**?" Like Wave 84 did for Commerce, this traces the *seams between* institutions —
where defects hide that no single-institution audit catches. It found **two real cross-institution defects**
(both contract-level, flagged for the audit phase, not faked off-chain) and **one off-chain coherence fix**
(applied). The core civilization invariants — Protection ≠ Custody, Authority ≠ Ownership, Business
Continuity ≠ Asset Transfer — all hold.

Verified (off-chain layer): typecheck 0, nav 0 broken, **126 tests / 13 suites**, no regression.

## Cross-institution defects found
### CID-1 — Recovery ↔ Inheritance are only UNIDIRECTIONALLY exclusive (contract-level)
The two institutions that both transfer vault control must not run at once. The exclusion is **half-built**:
- **Inheritance blocks on Recovery:** `initiateInheritanceClaim` reverts `INH_RecoveryInProgress` if a
  recovery rotation is pending (`CardBoundVaultInheritanceManager.sol:508`). ✅
- **Recovery does NOT block on Inheritance:** `VaultRecoveryClaim.sol` has **zero** inheritance references;
  `stageRecoveryRotation` checks only `guardianSetupComplete`. A recovery claim can be initiated and a
  rotation staged **while an inheritance claim is mid-flight** (veto or claim window). ❌
- **And the inheritance guard is initiation-only:** `claimHeirShare` / `finalizeInheritanceDistribution` /
  `ownerOverrideClaim` do **not** check recovery — so an inheritance claim that was already active
  *continues to completion* even after a recovery rotation is staged.

**Net:** the system permits **concurrent ownership transitions** — an inheritance distribution (vault →
heirs) and a recovery rotation (vault → a "recovered" wallet) racing against each other, with undefined
resolution. This is exactly the kind of seam a civilization audit exists to surface.

**Fix venue — contract, not frontend (and here's why a frontend guard would be dishonest):** the recovery
flow uses a recovery-ID indirection — the claimant is *not* the owner and does not know the target vault
address until the contract resolves it, so a UI cross-check could not reliably see the target vault's
inheritance state. Bolting one on would *imply* a protection that isn't actually enforced — a Veritas-Law
violation. The correct remedy is on-chain: make the exclusion **bidirectional and continuous** (recovery
initiation reverts if `inheritanceState != NORMAL`, and/or inheritance claim/finalize revert while a rotation
is pending). **Flagged for the contract-audit phase** alongside the Wave 88 post-veto-reclaim flag.

### CID-2 — Proof-of-Life is inheritance-scoped only (contract-level)
Proof-of-life is conceptually the owner's cross-cutting "I am alive" signal. In implementation it is honored
**only by inheritance** — `VaultRecoveryClaim.sol` and the business-transfer flow have **zero** proof-of-life
references. So a thoughtful owner who designates a proof-of-life wallet (a trusted second key) is protected
against a false *inheritance* claim but **not** against a false *recovery* rotation or a false *business
emergency transfer*. The mental model ("proof-of-life proves I'm alive") promises more than the code
delivers — a coherence gap across the organism.

**Two-part response:**
- **Off-chain (applied this wave):** tightened the proof-of-life explanation in `VaultInheritancePanel` so it
  honestly states scope — it covers *inheritance claims specifically*, and notes wallet recovery has its own
  owner-challenge protection. This removes the over-trust without claiming a capability that doesn't exist.
- **Contract (flagged):** if proof-of-life should be the universal alive-signal, the recovery-challenge path
  (and the business emergency-transfer veto) should accept the proof-of-life wallet as a valid owner-proof.
  That's a contract/auth change for the audit phase, not an off-chain patch.

## Owner-Returns Matrix (the centerpiece — composed across ALL institutions)
The owner's defense window differs by institution; this matrix shows what a returning owner can still do.
Windows: Recovery challenge **7d**; Wallet-rotation delay **≤7d** + guardian maturity **7d**; Inheritance
**veto 30d → claim 90d → memorial 365d**; Business emergency **veto 7d** + **reclaim 30d**.

| Owner returns at… | Recovery (rotation) | Inheritance | Business continuity | Net standing |
|---|---|---|---|---|
| **Day 5** | Challenge open — cancel it | Veto open — `ownerOverride` | Veto open — `veto` | **Fully protected everywhere.** |
| **Day 8** | Challenge may have elapsed → rotation can finalize | Veto open (30d) | Veto elapsed (7d) but **reclaim open (30d)** | Vault control may be lost to recovery; inheritance & business still recoverable. **Seam: recovery is the weakest window.** |
| **Day 30** | Long elapsed | Veto **just** elapsed → heirs may claim (fast-finalize possible) | Reclaim **just** elapsed → business gone | Most exposed point; both 30-day windows close together. |
| **Day 45** | — | In claim window — **no on-chain owner reclaim** (W88 flag) | Reclaim closed | Inheritance distribution may complete; W88 post-veto gap is the dominant risk. |
| **Day 90** | — | Claim window ending → memorial | — | Estate largely settled. |
| **After emergency business transfer** | n/a | n/a | **Reclaim within 30d (W89)** | Business reversible for 30 days. |
| **After inheritance claim (veto)** | n/a | `ownerOverride` cancels | n/a | Fully recoverable. |
| **After inheritance memorial** | n/a | No reclaim | n/a | Settled by design. |
| **Funds, any timing** | Vault is on-chain non-custodial | Heirs need secret+config | Funds excluded from business transfer | **Funds never custodied; no institution can seize them.** |

**Coherence finding (not a defect, but a civilization observation):** the **7-day recovery challenge** is the
*shortest* owner-defense window, yet a recovery rotation reassigns vault control — as consequential as
inheritance, which gives 30 days. An owner absent 8–29 days is well within every other institution's window
but may already have lost vault control to recovery. Worth aligning (e.g. a longer recovery challenge, or
accepting proof-of-life in recovery — see CID-2) in the contract-audit phase.

## Preparedness Edge Case Matrix (all scenarios, run against the organism)
| Scenario | System behavior | Verdict |
|---|---|---|
| Stolen / lost / broken phone | Daily-limit bound + queue + guardian cancel; recovery rotates to a new wallet | ✅ (W85/86) |
| SIM swap / email compromise | Off-chain auth deters; on-chain timelocks + guardians enforce | ✅ deterrence vs enforcement distinct |
| Hospitalization / coma (≤30d) | Inheritance veto + proof-of-life cancel; business reclaim | ✅ |
| Hospitalization / coma (>30d) | Inheritance post-veto gap (W88) + business reclaim window (W89) | ⚠️ W88 contract flag |
| Missing person / long absence | Designed-for state of Continuity; timers run | ⚠️ same W88 flag |
| Guardian death / disappearance | Survivable with redundancy; zero-redundancy warned (W87) | ✅ |
| Guardian compromise / collusion | Grief-cancel bounded; collusion blocked by owner challenge + 30d cooldown (W87) | ✅ |
| Heir death | Pro-rata normalization across revealed heirs; forfeited share to pool (W88) | ✅ |
| Divorce / family dispute | Heir shares are pre-set basis points, capped, deterministic (W88) | ✅ |
| False activation | Guardian-only init, DAO-veto-not-init, state guards (W88) | ✅ |
| Continuity hijacking | Commitment-secret + configured-heir double-gate (W88) | ✅ |
| **Recovery during an active inheritance claim** | **Concurrent transitions possible** | ❌ **CID-1** |
| **Proof-of-life vs false recovery / business transfer** | **Not honored outside inheritance** | ❌ **CID-2** |

## Civilization Cohesion (Stage 8 — core invariants verified)
- **Recovery ≠ Continuity ≠ Inheritance:** mostly enforced (inheritance ≠ recovery via `INH_RecoveryInProgress`);
  the gap is CID-1 (not yet bidirectional). Continuity *is* the inheritance state machine on-chain (correct —
  they are one mechanism, not two colliding ones).
- **Business Continuity ≠ Asset Transfer:** ✅ verified — `TRANSFERABLE_MERCHANT_TABLES` is an explicit
  business-only allow-list, "Funds tables are deliberately excluded… this never touches funds."
- **Protection ≠ Custody:** ✅ verified system-wide — no freeze/seize/drain/forceWithdraw primitive exists;
  even the Seer risk monitor is *advisory only* ("its verdict is intentionally NOT enforced… can never be
  blocked", `CardBoundVault.sol:2083`). The non-custodial invariant holds across every institution.
- **Authority ≠ Ownership:** ✅ verified — guardians cancel/pause/challenge but never redirect; trustees only
  initiate timelocked recovery; heirs need secret+config; emergency operators get a veto-windowed business
  request with funds excluded. **No non-owner role can take ownership or funds.**

## Stage 9 — Grandmother Preparedness Test
Can a normal person understand the system? **Mostly yes, with the gaps this audit narrowed.**
- *How do I recover?* — Wallet Rotation via guardians (clear). ✅
- *How are my assets protected?* — non-custodial vault; only you hold keys (clear, and now Protection≠Custody
  is provably true). ✅
- *What do heirs do?* — inherit your vault if you're gone, by pre-set shares (clear, W88). ✅
- *What does proof-of-life do?* — now honestly scoped: cancels a false *inheritance* claim while you're away
  (fixed this wave; previously implied broader). ✅ (after fix)
- *What if I disappear / die / return?* — the Owner-Returns Matrix above is the answer; the honest hard edge
  is "return after ~30 days" (W88 flag), which the product surfaces rather than hides. ⚠️ but honest.

The one genuine comprehension risk remaining is that an owner cannot easily tell *which* "I'm away" defense
covers *which* takeover path (proof-of-life = inheritance only; challenge = recovery; veto/reclaim =
business). That is the human face of CID-2 and the window-misalignment finding.

## Remaining risks (honest)
1. **CID-1 (Recovery↔Inheritance concurrency)** — contract-level; the most important new finding. Concurrent
   ownership transitions are possible until the exclusion is made bidirectional and continuous on-chain.
2. **CID-2 (Proof-of-life scope)** — contract-level; the alive-signal doesn't span institutions. Copy fixed;
   capability expansion flagged.
3. **W88 post-veto owner reclaim** — still the dominant single-institution flag; carried forward.
4. **Recovery challenge window (7d) is shorter than inheritance veto (30d)** for a comparably consequential
   action — a coherence/alignment question for the audit.
5. **Business-continuity flow has no UI and operator access isn't enforced** (W89) — execution deferred.
6. **On-chain runtime unproven here** — contracts can't be compiled in this environment; all contract-level
   verdicts are by inspection. The audit + deploy is the real gate.

## Preparedness Certification Decision — CONDITIONAL
By the "complete or it doesn't launch" standard, and given the brief's instruction to certify honestly:

**The preparedness organism is COHERENT and its foundational invariants HOLD** — non-custodial throughout, no
non-owner can seize ownership or funds, business continuity excludes assets, and the institutions are
individually audited (W85–89) and named truthfully (W90). **It is NOT yet unconditionally certifiable**,
because two real cross-institution defects (CID-1, CID-2) plus the W88 post-veto flag are contract-level and
unresolved — and all three touch the system's most important promise: *what happens to your ownership when
you cannot speak for yourself.*

**Certification: CONDITIONAL PASS — coherent and non-custodial, gated on a contract-audit pass that resolves
CID-1, CID-2, and the W88 post-veto reclaim.** This is the honest result: the civilization functions as one
organism and protects ownership, but three ownership-transition seams must be closed on-chain before it can
carry real families' assets unconditionally. None are off-chain-fixable; faking them would betray the
standard. The off-chain coherence fix (proof-of-life scope honesty) is applied; the rest is correctly the
contract audit's job.

## Next
The contract-audit phase is now the critical path, with a precise, prioritized list: **CID-1** (bidirectional
recovery/inheritance exclusion), **CID-2** (proof-of-life as a cross-institution alive-signal), the **W88
post-veto reclaim** boundary, the **W87 `threshold == count`** rejection, and the **recovery-challenge-window
alignment**. Off-chain, the remaining build is the **business-continuity UI + enforced operator access**
(W89). Once the contract audit closes the three ownership-transition seams, the civilization earns
unconditional certification.
