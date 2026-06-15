# Continuity Campaign — Audit 3: Inheritance Claims (ACTIVE path)

**Scope:** the ACTIVE inheritance claim + distribution path — the commit-reveal heir mechanism (`claimHeirShare`)
and the proportional distribution (`finalizeInheritanceDistribution`) in
`contracts/vault/CardBoundVaultInheritanceManager.sol`. This is where false-activation and over-claim risk live.
Conducted under the Continuity Campaign rule (Audit → Finding → Root Cause → Fix → Retest → Re-Audit → Registry).

## Method
1. **Source read** — full read of `claimHeirShare` (commitment hash, replay guards, basis-point handling) and
   `finalizeInheritanceDistribution` (the proportional split, over/under-subscription, rounding, floor).
2. **Executable model** — `lib/audit/inheritanceClaimModel.ts`.
3. **Matrix** — `__tests__/audit/inheritanceClaim.test.ts`: **15 scenarios** (commit-reveal integrity, over-claim,
   wrong-secret, non-heir, replay, distribution math, over/under-subscription, rounding, colluding heirs, the
   Audit-3 zero-weight guard). **All pass; typecheck 0; full audit suite 509/19 green.**

## What's strong (verified)
- **Over-claim is cryptographically impossible:** `basisPoints` is bound inside the commitment
  `keccak256(domain, chainid, vault, configVersion, actor, basisPoints, heirSecret)`. Revealing a larger (or
  different) share does not match `heirCommitmentByGuardian[actor]` → reverts (CR-02). The hash also binds actor,
  secret, chain, vault, and config version — no cross-actor, cross-chain, cross-vault, or cross-config replay
  (CR-03/04).
- **Replay protection:** an heir cannot reveal twice in a claim (`revealedByNonce`, REPLAY-01); a commitment
  cannot be claimed twice ever (`claimedHashes`, REPLAY-02).
- **No over-payment, ever:** distribution is PROPORTIONAL to `totalRevealed`
  (`payout = balance * bps / totalRevealed`), so the sum equals exactly the vault balance even when the owner
  over-subscribed commitments past 10000 — over-subscription dilutes proportionally rather than over-paying
  (DIST-02, COLLUDE-01). The last revealer absorbs rounding dust, so no wei is lost or created (DIST-04).
- **Returning-owner protection (re-verified from Audit 1):** the claim-window floor blocks colluding heirs from
  finalizing on day 1, preserving the owner's reclaim window; `revealedCount == 0` enters memorial with funds
  preserved (ZERO-03).

## Finding

### Finding 3 (LOW, FIXED) — division-by-zero brick when all revealing heirs committed 0 basis points
**Root cause:** `basisPoints` is hidden in the commitment at config time (a hash), and `claimHeirShare` does NOT
reject a 0-basis-point reveal. If two-or-more revealing heirs all committed 0 bps, `totalRevealed == 0`, and the
proportional split `payout = (balance * bps) / totalRevealed` divides by zero — reverting. Because `revealedCount
!= 0`, the `revealedCount == 0` memorial path is unreachable, so finalization is **permanently bricked**: funds
cannot distribute and the vault cannot exit the claim state.
**Severity reasoning:** LOW. It requires a degenerate owner configuration (heirs with 0 share — nonsensical), and
only the OWNER sets commitments, so it is **not attacker-reachable** — a robustness/footgun issue, not a
vulnerability. But a permanently-stuck inheritance is a real availability defect for a continuity system, and the
guard is cheap.
**Fix:** `finalizeInheritanceDistribution` now guards `totalRevealed == 0` BEFORE the split — treating a
zero-weight reveal set like an empty one (finalize with no distribution; funds remain → memorial). No division by
zero. (A single 0-bps revealer was already safe, taking the last-heir no-division path; the guard covers the 2+
case.)
**Retest / Re-audit:** model encodes the guard; matrix ZERO-01 (two 0-bps heirs → finalize succeeds, memorial,
no payout) verifies the fix; ZERO-02/03 confirm the single-revealer and no-revealer paths. Full audit suite
re-run green (509/19).
**Caveat (honest):** SOURCE-level contract change, structurally sound, **not compile-confirmed** in this
environment — stage-2 (hardhat) is the confirmation. The model verifies the logic.

### Considered (documented policy, no change)
- **Under-subscription redistributes to revealers:** if some configured heirs don't reveal, the revealing heirs
  (last absorbs the remainder) split the whole balance rather than the unrevealed shares being held. This is a
  deliberate policy (avoids stuck funds when an heir loses their secret or predeceases) and is not a security
  issue — the vault never over-pays. Documented as expected behavior (DIST-03), not a finding.

## Registry impact
Inheritance Claim / Distribution capabilities advance on the stages this audit evidences — **source-correct (1),
permissions (6: only configured heirs reveal; finalize gated), edge matrix (10), adversarial (11),
cross-system (12: recovery-precedence + floor)**, and the grandmother property (13: heirs get exactly their
committed share, no one is over-paid, and a misconfiguration cannot permanently trap funds). **Stage 2 remains
`~` (compiled bytecode pending — and gates the Audit-3 fix); stages 3–5, 7–9 remain `.`.** Honest partial
advance, not all-14.
