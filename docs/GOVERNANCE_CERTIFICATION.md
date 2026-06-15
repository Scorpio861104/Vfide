# Governance — Certification Report

Fifth system outside Commerce through the gate discipline. It carried a **specific flag from the systems
tracker**: `EmergencyControl.sol` had to be scrutinized against the non-custodial invariant, because an
"emergency control" in a protocol that promises no freeze/seize is exactly the kind of thing that must be
*checked*, not assumed safe. The audit's central question was the **boundary between governance power and user
funds**: governance should govern the protocol but must never reach into a user's vault.

**Verdict up front:** Governance **holds at the source level** with **no new findings**. The emergency-control
flag resolves cleanly (it cannot touch user funds), and governance integrity rests on the same foundation as
everything else — ProofScore — which makes it structurally resistant to wealth/flash-loan capture. Marked
**⚠️ CERTIFIED WITH KNOWN BOUNDARIES** for the standing compile reason (no solc → source audit + 30-scenario
executable model), not for any defect.

> ⚠️ **Methodology boundary (as in Core Ownership / Recovery / Trust):** source-level audit + executable logic
> model, not an on-chain/compiled test. A compiled hardhat run remains the required next step.

## The flag — EmergencyControl CANNOT reach user funds (resolved)
`EmergencyControl.sol`'s own header settles it: **"No vault-level locks here (that's GuardianLock/PanicGuard).
This is ONLY the global breaker toggle."** Verified in detail:
- It toggles an external `IEmergencyBreaker` whose entire interface is `halted()` + `toggle(on, reason)` — a
  **global protocol halt flag**, not a fund-mover. The breaker isn't even deployed in V1.
- It contains **no reference to user vaults, freeze, seize, or user funds** (the only "vault" mention is the
  comment disclaiming vault locks).
- `GuardianLock` / `PanicGuard` (the vault-level locks the comment names) exist **only in `contracts/legacy/`**
  — they are NOT in the active vault, consistent with the Core Ownership finding of zero freeze/seize/lock
  functions in `contracts/vault/`.
- **Critically, the vault does NOT consult the global breaker.** A protocol-wide halt therefore **cannot trap a
  user's withdrawals** — the owner-signed-intent fund-exit path certified in Core Ownership is independent of
  governance/emergency state. This is the non-custodial boundary holding at the governance layer: governance
  can pause the *protocol*, but it can never freeze *your* funds.

The breaker toggle is gated two ways — DAO direct, or an **emergency committee M-of-N** — with an anti-flap
cooldown **floored at 5 minutes** (L-2 fix: a zero cooldown would disable anti-flap entirely) and vote expiry.

## Voting integrity — ProofScore-weighted, so it cannot be bought or flash-loaned (the key finding)
This is the most important governance property, and it's excellent: **VFIDE governance is not token-weighted —
it is ProofScore-weighted.** That structurally defeats the entire class of wealth/flash-loan governance attacks:
- **Vote weight = `seer.getScoreAt(voter, snapshot)`** — the voter's ProofScore at a frozen snapshot (DAO-05:
  frozen at proposal creation, not first-vote). Since ProofScore can't be bought or borrowed (certified in the
  Trust audit — behavioral aggregate, no wealth input), **a flash loan buys tokens but zero votes.** Two voters
  with equal score have equal weight regardless of token balance (matrix D2–D3).
- **A voter must own a vault AND pass SeerGuardian governance restrictions** (`_eligible`) — "Seer keeps the DAO
  in check": a flagged bad actor can be restricted from governance.
- **Timing protections:** votes are rejected before the proposal start (flash-loan timing protection) and in a
  30-minute final grace window (anti-front-running); one vote per address.
- **Governance fatigue:** weight is reduced for voting too frequently (anti-domination).

## Proposal lifecycle & treasury — quorum floor, timelock, no drain primitive
- **Voting period bounded** to [1 hour, 30 days]; **quorum has an absolute floor** (`ABSOLUTE_MIN_QUORUM = 500`)
  that governance cannot cascade below (DAO-02 fix); a quorum-rescue path exists only to break a genuine
  deadlock (with secondary approval, F-22/DAO-03).
- **Execution is timelock-only:** a proposal executes only if passed (for > against), quorate, the timelock has
  elapsed, and the caller is the timelock — there is no direct-execution backdoor.
- **Treasury** (`EcoTreasuryVault`) holds *ecosystem* VFIDE (not user funds), is DAO-gated with **timelocked
  module changes**, and exposes no arbitrary-recipient drain primitive — disbursement flows through authorized
  notifiers/modules. (Note: this protects the ecosystem treasury's governance; it is not a user-funds surface,
  which is the vault's domain and already certified non-custodial.)

## The Scenario Matrix — 30 executing scenarios
`__tests__/audit/governanceModel.test.ts` over `lib/audit/governanceModel.ts` (logic modeled from source):
- **A. Emergency boundary (A1–A3):** global-halt scope only; a halt can't block a user withdrawal; emergency
  can't touch user funds.
- **B. Committee M-of-N + cooldown (B1–B7):** DAO or M-of-N toggle; below-threshold/attacker blocked; cooldown
  floor enforced and anti-flap timing.
- **C. Voter eligibility (C1–C3):** vault + SeerGuardian governance permission.
- **D. Flash-loan-proof voting (D1–D4):** **a billion tokens buys zero weight; equal score = equal weight;**
  fatigue reduces weight.
- **E. Vote timing (E1–E6):** pre-start, post-end, grace-window, double-vote, ineligible all rejected.
- **F. Lifecycle (F1–F7):** voting-period bounds, quorum floor, and execute requires passed + quorate +
  timelock-elapsed + timelock-caller.

Full regression green (all five audit matrices total 180); typecheck 0.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ DAO + DAOTimelock + EmergencyControl + EcoTreasuryVault + voting lifecycle mapped |
| Functional | ✅ propose/vote/quorum/timelock/execute + breaker toggle modeled |
| Edge-Case | ✅ voting-period bounds, quorum floor, cooldown floor, vote timing windows |
| Adversarial | ✅ **emergency can't reach vaults; flash-loan buys no votes; no treasury drain primitive; no direct execution** |
| Integration | ✅ governance weight = ProofScore (Trust); eligibility via SeerGuardian; vault independent of breaker (Core Ownership boundary holds) |
| Grandmother | ✅ no one can vote your funds away by being rich, and an emergency stop can pause the protocol but never freeze your wallet |
| **Governance (source + logic model)** | ✅ **HOLDS — no new findings** |
| **On-chain / compiled re-verification** | ⚠️ **not executed here (documented boundary)** |

## Residual honesty notes
- "Verified" = source-read + executable logic model, not on-chain execution (standing campaign caveat). A
  compiled hardhat run is the required next step.
- **CouncilElection.sol** (788 lines — council voting/elections/salary) and **AdminMultiSig.sol** (587) were
  confirmed to exist and sit in the governance group but were **not audited to depth here**; the core DAO
  proposal/vote/treasury/emergency path was the focus. Council elections + multisig oversight are candidates
  for a focused follow-up.
- **DAOTimelock.sol** (705) was treated at its boundary (execution is timelock-gated, emergency-replacement has
  secondary approval) but its full queue/grace/cancel semantics were not exhaustively modeled — a compiled-run
  item.
- The **emergency committee membership management** (foundation-managed, 24h-timelocked per the code) was read
  at the toggle/threshold level; the member add/remove + auto-clamp logic (M-33 fix) is a detail for the
  compiled pass.
- **GovernanceHooks.sol** and **OwnerControlPanel.sol** (1603 — a large surface) are in the governance/oversight
  orbit and were not audited here; OwnerControlPanel especially warrants its own pass given its size and name.

## Tracker impact
Governance moves 🔴 → ⚠️ (DAO/voting/treasury/emergency source-certified; CouncilElection, AdminMultiSig,
DAOTimelock depth, OwnerControlPanel are noted follow-ups). Next per the tracker: **Social & Communication**
(Messaging / Reviews / Evidence Sharing / Reputation) — where review/endorsement abuse feeds Trust, so its
abuse-resistance matters to systems already certified.
