# FraudRegistry.sol + FraudJury.sol — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Gate-audit of the fraud process: `contracts/FraudRegistry.sol` (783L) + `contracts/FraudJury.sol` (219L). Method
matches the on-chain campaign: **source-level audit + an executable TS process model** run as an adversarial
matrix (no solc here — a compiled run is the confirming step). The repo's `FraudRegistry` / `NonCustodialNoFreeze`
hardhat suites are the on-chain evidence for a compiler-equipped environment.

- Model: `lib/audit/fraudModel.ts`
- Matrix: `__tests__/audit/fraudModel.test.ts` — **22 scenarios, all pass**; project typecheck 0.

## Central question
The fraud surface is where the non-custodial invariant is most tempting to break — "punish the fraudster by
taking their funds." The audit asks: does a confirmed fraud finding let anyone seize or freeze the accused's
funds, can the DAO unilaterally brand someone a fraudster, and is the accusation process spam-resistant and fair?

**Verdict: fraud is punished by reputation + service-ban ONLY (never funds); condemnation requires a peer-jury
supermajority (the DAO can veto but never confirm); accusation is spam-resistant; and flags decay/are redeemable.**
⚠️ (not 🟢) only because the verdict rests on source + model rather than a compiled run.

## What the audit verified (from source)

**The consequence is non-custodial (the crux).**
- A confirmed flag's ONLY effects are: a risk SIGNAL to counterparties, a Seer score penalty (→ higher fees), and
  a SERVICE ban (no merchant / pool rewards / endorsing). The contract states plainly: *"Transfers are NEVER held,
  delayed, or seized — a user's funds always move"* and *"It does NOT seize tokens. The flagged user keeps
  everything in their vault."*
- `escrowTransfer` is now a **no-op ABI-compatibility stub** (the former 30-day hold was removed);
  `releaseEscrow`/`rescueStuckEscrow` were removed. No escrow is ever created.
- `confirmFraud` only sets `isFlagged = true` — it moves no funds. `rescueExcessTokens` recovers only
  accidentally-sent tokens (since no escrow is held, any balance is excess) — it cannot target the accused's
  funds, which live in their own vault, never in the registry.

**Peer-confirmed, not DAO-decreed.**
- `confirmFraud` is `onlyDAO` but, when a jury is wired, **requires `fraudJury.isConfirmed(target)`** — the DAO
  cannot unilaterally confirm fraud. FraudJury's header is explicit: *the DAO can veto a case (force Dismissed)
  but can NEVER confirm one — punishment requires peer consensus.* The DAO's only fraud power is mercy.
- The no-jury fallback requires a 48h appeal window to elapse — a legacy/bootstrap path that still gives the
  accused time to appeal, not a DAO backdoor.

**Commit-reveal peer jury, leniency by default.**
- Votes are commit-reveal — early votes can't anchor later ones (no bandwagoning).
- Confirm requires `>= JURY_QUORUM` (5) reveals AND `>= CONFIRM_SUPERMAJORITY_PCT` (66%, ~2/3) of revealed votes;
  otherwise Dismissed. **Quorum failure => Dismissed** — an explicit fail-safe to leniency: an absent jury CLEARS
  the accused rather than punishing them.

**Spam-resistant accusation.**
- Reporter must have ProofScore `>= MIN_REPORTER_SCORE`; one complaint per reporter/target/epoch; self-reporting
  rejected. `COMPLAINTS_TO_FLAG` (3) triggers review. A dismissed false complaint **slashes the reporter's score,
  escalating for repeat offenders** (the reporter bond) — false-accusation campaigns are costly.

**Forgiveness.**
- A confirmed signal + service-ban **auto-expires after `SIGNAL_TTL` (90 days)** (decay/forgiveness); explicit
  permanent bans are exempt. Restitution (make a victim whole → confirmed) clears the flag early. Not a permanent
  scarlet letter.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/FraudRegistry.test.ts` — deployment, score-gated reporters, no self-complaint, file/confirm flow.
- `test/hardhat/NonCustodialNoFreeze.test.ts` — `requiresEscrow` is FALSE even for a confirmed-fraud address;
  `escrowTransfer` always reverts/no-ops; punishment is service-ban, not fund-seizure.
- Wire into the verification harness/manifest alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via the two hardhat suites above.
- A vestigial comment on `isFlagged` ("service ban + escrow") and `vfideToken` ("escrow releases") references the
  REMOVED escrow; harmless but worth cleaning up so the source matches the (correct) non-custodial behavior.
- FraudJury's juror selection/eligibility (who is empanelled, and the score-gating of jurors) was read at the
  interface level; the empanelment mechanics should be spot-confirmed on a compiled build. Nothing found lets a
  confirmed flag touch funds or lets the DAO confirm alone.
- No new findings.

## Bottom line
The fraud process is **non-custodial, peer-confirmed, and forgiveness-capable**: a confirmed flag punishes only
reputation and service access (never funds — the accused keeps every token in their vault), condemnation requires
a 2/3 supermajority of a commit-reveal peer jury with leniency on quorum failure, the DAO can only show mercy
(veto/dismiss) and never brand a fraudster alone, accusations are score-gated and bonded against spam, and flags
decay after 90 days or clear via restitution. The non-custodial invariant holds at the fraud surface.
