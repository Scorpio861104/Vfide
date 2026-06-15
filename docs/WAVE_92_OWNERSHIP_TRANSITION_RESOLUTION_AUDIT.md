# Wave 92 — Ownership Transition Resolution Audit

A design audit, not an implementation wave. The objective is to determine the **final ownership-transition
model** that resolves every seam the Preparedness Civilization Audit (W91) concentrated onto one fault line:

> **What happens when ownership changes while the owner cannot actively speak for themselves?**

No code was changed — these five issues are all contract-level, touch the most sensitive ownership paths,
and cannot be compiled/verified in this environment, so implementing them here would be both out of scope and
unverifiable. What this wave produces is the model: for each seam, the resolution, the *precise* grounded
change (exact function + current guard + the guard to add), and — the part that matters most — proof that the
five resolutions form **one coherent model** rather than five patches that might fight each other.

## The unifying principle (the whole model in one sentence)
Every one of the five seams is a special case of a single rule:

> **A demonstrated "the owner is alive / acting" signal must consistently and durably outrank a "the owner is
> presumed gone" process — across every institution — until assets irreversibly leave.**

The current system violates this in five places. Resolving each to serve that one rule makes them cohere.

## The five seams, each resolved to the principle

### CID-1 — Recovery ↔ Inheritance concurrency → *Recovery (evidence of life) outranks Inheritance*
**Now (grounded):** `stageRecoveryRotation` (`CardBoundVault.sol:2194`) checks only `guardianSetupComplete` —
no inheritance check. The inheritance guard `if (_pendingRecoveryRotation()) revert INH_RecoveryInProgress()`
exists at exactly one point (`CardBoundVaultInheritanceManager.sol:508`, `initiateInheritanceClaim`) — so
`claimHeirShare` / `finalizeInheritanceDistribution` are unguarded. Result: concurrent ownership transitions.

**Resolution — make the exclusion bidirectional AND continuous, with recovery precedence.** Recovery means
the owner (or their trustee) is asserting the owner is *alive and recoverable* — that is evidence of life and
must trump the presumption of death. Concretely:
1. **Recovery blocks/suspends inheritance progression** — add `if (_pendingRecoveryRotation()) revert
   INH_RecoveryInProgress()` to `claimHeirShare` AND `finalizeInheritanceDistribution` (extend the line-508
   guard to the whole claim path), so an in-flight inheritance cannot advance while a recovery is pending.
2. **Recovery completion cancels inheritance** — `executeRecoveryRotation` should reset the inheritance state
   to NORMAL (the new owner supersedes any death presumption).
3. **A pending inheritance does not block recovery** (recovery precedence) — recovery may start during an
   inheritance claim; it suspends that claim per (1).

**The abuse check (why precedence is safe):** a *malicious* recovery (a thief's trustee) could try to use
this to grief a legitimate inheritance. It cannot win, because recovery is itself challengeable — the
original owner (and, per CID-2, the proof-of-life wallet) can `challengeClaim` the recovery, and recovery has
a bounded lifetime (it expires). A malicious recovery that suspends inheritance is therefore itself
cancellable, and on expiry the inheritance resumes. **The contract audit must specify the resume/cancel state
transition precisely** — this is the one piece with real state-machine subtlety.

### CID-2 — Proof-of-Life scope → *One alive-signal, honored everywhere*
**Now (grounded):** `ownerOverrideClaim` already accepts `snapshotProofOfLifeWallet`
(`InheritanceManager:564`) — so proof-of-life works for inheritance. But `VaultRecoveryClaim.challengeClaim`
is gated `msg.sender != claim.originalOwner` (`:698`) — proof-of-life cannot challenge a recovery. The
business-transfer `veto` is owner-only and the off-chain flow has zero proof-of-life references.

**Resolution — proof-of-life becomes the civilization-wide alive signal.** If a user explicitly designates a
trusted proof-of-life wallet, that one signal should stop *any* "you're gone" process:
1. **Recovery:** `challengeClaim` should accept the vault's `proofOfLifeWallet` in addition to
   `originalOwner`. Feasible — the inheritance manager exposes `proofOfLifeWallet`; recovery reads it via the
   vault. (Recovery resolves the vault from the claim, so the target vault *is* known here — unlike the
   initiation path — so this guard is reliable, not the dishonest-frontend case from W91.)
2. **Business continuity:** the emergency-transfer `veto` should accept a business-level proof-of-life
   designation. Because business continuity is off-chain and doesn't currently know the on-chain
   proof-of-life wallet, this needs either (a) a business-level proof-of-life field, or (b) the API reading
   the chain. **Recommend (a)** for clean separation (business ≠ vault), mirroring the on-chain concept.

**Coherence with CID-1:** proof-of-life challenging a *recovery* (CID-2) and recovery suspending
*inheritance* (CID-1) compose correctly — the alive signal can stop the recovery, which then lets inheritance
resume or not, all driven by the same "is the owner actually here?" question.

### W88 — Post-veto owner reclaim → *Reclaim until assets irreversibly leave*
**Now (grounded):** `ownerOverrideClaim` reverts unless `inheritanceStateValue == STATE_VETO_PERIOD`
(`:561-562`), and `_rolloverToClaimWindowIfNeeded()` auto-advances at 30 days. After veto, no owner reclaim —
yet `claimHeirShare` only *registers* commitments and `finalizeInheritanceDistribution` is a separate step,
so assets have NOT actually left at veto-end.

**Resolution — extend the alive-signal's reach to the point of irreversibility, not an arbitrary 30-day cliff.**
The owner / proof-of-life wallet should be able to cancel an inheritance claim **any time before distribution
is finalized**, i.e. allow `ownerOverrideClaim` in CLAIM_WINDOW too, gated on `!distributionFinalized`
(instead of the `STATE_VETO_PERIOD`-only check). Once `distributionFinalized` (heir shares computed) or
consumed, it is settled — heirs retain certainty at the true point of no return rather than a premature one.

**The fast-finalize caveat (must be addressed together):** because `finalizeInheritanceDistribution` can run
as soon as *all* heirs reveal (not only after 90 days), "until finalized" could still be short if heirs
coordinate. So pair the reclaim extension with **a minimum claim-window floor before finalize is permitted**
(e.g. finalize allowed only after `max(all-revealed, N days into the claim window)`), giving a returning
owner a guaranteed floor regardless of heir coordination. This is the W88 resolution, and it's *why* W88
survived to civilization level — it's a genuine "when is it truly irreversible?" decision, now answered:
**irreversibility = distribution finalized, and finalize cannot happen before a guaranteed floor.**

### W87 — Threshold == Guardian Count → *Ownership-transition mechanisms must be fault-tolerant*
**Now (grounded):** `setGuardianThreshold` (`AdminFacet:298`) rejects only `threshold == 0 || threshold >
guardianCount` — so `threshold == guardianCount` (zero redundancy) is allowed; losing one guardian locks
recovery forever. Off-chain warning already added (W87); the contract still permits it.

**Resolution — require at least one guardian of redundancy once a real guardian set exists.** After guardian
setup is complete, reject `threshold == guardianCount` when `guardianCount >= 2` (i.e. enforce `threshold <=
guardianCount - 1` for any multi-guardian set), with a clear `CBV_ZeroRedundancy` error. Preserve the
single-guardian bootstrap path (guardianCount < 2) so initial setup isn't bricked. This is the contract-level
enforcement behind the existing advisory warning — recovery (an ownership-transition mechanism) must survive
the loss of one guardian.

### Recovery Window Alignment → *Comparable owner-defense windows for comparable ownership transitions*
**Now (grounded, corrected):** there are TWO recovery challenge periods — `CHALLENGE_PERIOD = 7 days`
(guardian path) and `ACTIVE_VAULT_CHALLENGE_PERIOD = 14 days` — vs inheritance's 30-day veto. So the gap is
7–14d vs 30d, smaller than a bare "7 vs 30" but real: a malicious recovery (which reassigns vault control,
as consequential as inheritance) gives the owner less time to catch it than a malicious inheritance claim.

**Resolution — two complementary moves, neither alone sufficient:**
1. **Raise the recovery challenge floor** toward the inheritance veto — align to a common window (e.g. 14 →
   ~30 days, or a single unified `OWNER_DEFENSE_WINDOW`). Tension: a longer challenge delays a *legitimately*
   locked-out owner regaining access. Mitigate by keeping recovery *fast when uncontested and strongly
   guardian-approved*, with the longer window as the challenge ceiling, not a mandatory wait.
2. **Proof-of-life as challenge (CID-2)** gives the absent owner a durable second channel regardless of the
   raw window. Together, an absent owner has a *comparable* effective window across recovery and inheritance.

This is intentionally a *judgment* for the contract audit (the exact day-counts depend on threat-model risk
appetite), but the *direction* is fixed: the two ownership-transition pathways should not have wildly
different owner-defense windows.

## Coherence proof — do the five resolutions fight each other?
| Pair | Interaction | Coherent? |
|---|---|---|
| CID-1 × W88 | Both assert "life evidence beats death presumption until assets leave" (recovery suspends inheritance; reclaim until finalized). Same rule, different trigger. | ✅ |
| CID-1 × CID-2 | Proof-of-life can stop the *recovery* (CID-2); recovery suspends *inheritance* (CID-1) — chained, both driven by "is the owner here?". | ✅ |
| CID-2 × W88 | Proof-of-life is the alive signal (CID-2); W88 extends *when* it can act (until finalized). CID-2 widens *which institutions*, W88 widens *when*. Orthogonal, complementary. | ✅ |
| CID-2 × Window alignment | Proof-of-life gives a durable channel; window alignment fixes the raw timer. Belt-and-suspenders, same goal. | ✅ |
| W87 × all | Redundancy ensures the ownership-transition *mechanisms* themselves are robust — a precondition for the others to be trustworthy. | ✅ |
| CID-1 × abuse | A malicious recovery suspending inheritance is itself challengeable (CID-2) + expires — the one subtlety the audit must pin down (resume/cancel transition). | ⚠️ specify carefully |

The only real subtlety is the CID-1 resume/cancel state transition (what happens to a suspended inheritance
when a recovery expires vs completes vs is challenged). Everything else composes cleanly into the one rule.

## The final ownership-transition model (the deliverable)
1. **One alive-signal.** The owner key *and* a designated proof-of-life wallet are the alive signal, honored
   across Inheritance, Recovery, and Business Continuity. (CID-2)
2. **Mutual exclusion with recovery precedence.** Recovery and Inheritance can never run concurrently;
   recovery (evidence of life) suspends/cancels inheritance; recovery is itself challengeable, so it can't be
   weaponized to block inheritance forever. (CID-1)
3. **Reclaim until irreversible.** The alive-signal can stop any ownership transition until assets
   irreversibly leave — inheritance: until distribution is *finalized* (and finalize cannot occur before a
   guaranteed claim-window floor); business: until the reclaim window closes; recovery: until rotation
   executes. (W88)
4. **Fault-tolerant mechanisms.** No ownership-transition mechanism may be configured with zero redundancy.
   (W87)
5. **Comparable defense windows.** The owner's window to stop a malicious ownership transition is comparable
   across pathways (recovery challenge aligned toward inheritance veto, plus proof-of-life as a durable
   channel). (Window alignment)

## Where each resolution must be implemented (all contract-audit phase)
| Seam | File · function · exact change |
|---|---|
| CID-1 | `CardBoundVaultInheritanceManager.sol` — add `_pendingRecoveryRotation()` revert to `claimHeirShare` + `finalizeInheritanceDistribution`; `CardBoundVault.sol:executeRecoveryRotation` — reset inheritance to NORMAL; specify suspend/resume state. |
| CID-2 | `VaultRecoveryClaim.sol:challengeClaim:698` — also accept vault's `proofOfLifeWallet`; business-transfer — add business-level proof-of-life veto. |
| W88 | `CardBoundVaultInheritanceManager.sol:ownerOverrideClaim:561` — allow in CLAIM_WINDOW gated on `!distributionFinalized`; `finalizeInheritanceDistribution` — add minimum claim-window floor. |
| W87 | `CardBoundVaultAdminFacet.sol:setGuardianThreshold:299` — reject `threshold == guardianCount` when `guardianCount >= 2` (`CBV_ZeroRedundancy`), preserve bootstrap. |
| Window | `VaultRecoveryClaim.sol` `CHALLENGE_PERIOD`/`ACTIVE_VAULT_CHALLENGE_PERIOD` — align toward inheritance veto; combine with CID-2. |

## Remaining risks / open decisions for the audit (honest)
- **CID-1 resume/cancel semantics** — the one genuinely subtle piece; must be fully specified (suspended
  inheritance on recovery-expiry vs recovery-completion vs recovery-challenge).
- **Exact day-counts** (claim-window floor, aligned challenge window) are risk-appetite judgments, not
  derivable from code — the audit/owner must set them.
- **Business-level proof-of-life** requires a small new off-chain field (recommended) or chain reads.
- **On-chain runtime unproven** — every change here is contract-level and must be implemented and tested
  under the professional audit + deploy. This wave is the *specification*, not the implementation.

## Completion decision
**This wave's deliverable — the final ownership-transition model — is COMPLETE.** All five seams are resolved
into one coherent model serving a single principle, each with a precise grounded change location, and the
resolutions are proven mutually compatible (with the one CID-1 subtlety flagged for careful specification).
**No implementation was done, by design** — the model is now ready to hand to the contract-audit phase as its
specification. Until that phase implements and verifies it on-chain, the Preparedness Civilization remains at
**conditional certification**; once these five are closed per this model, it earns **full certification**.

## Next
The contract-audit phase implements this model (CID-1, CID-2, W88, W87, window alignment) on-chain, with
hardhat tests for each — especially the CID-1 suspend/resume state machine and the W88 finalize-floor.
Off-chain, the remaining build is the business-continuity UI + enforced operator access (W89) and the
business-level proof-of-life field (CID-2). After the audit closes the five seams, re-run a focused
Ownership-Transition verification, then move the Preparedness Civilization from conditional to full
certification.
