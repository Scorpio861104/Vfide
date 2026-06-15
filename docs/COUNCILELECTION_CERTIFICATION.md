# CouncilElection.sol — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Gate-audit of `contracts/CouncilElection.sol` (788 lines) — the contract that fills the council seats AdminMultiSig
uses and the DAO's quorum-sync references; the last named Governance target. Method matches the on-chain campaign:
**source-level audit + an executable TS election/seating/term-limit model** run as an adversarial matrix (no solc
here — a compiled run is the confirming step). The repo's `CouncilElectionVoting` hardhat suite is the on-chain
evidence for a compiler-equipped environment.

- Model: `lib/audit/councilElectionModel.ts`
- Matrix: `__tests__/audit/councilElectionModel.test.ts` — **24 scenarios, all pass**; project typecheck 0.

## Central question
Can council seats be bought, can sybils swing an election, can an arbitrary set be seated instead of the actual
winners, can a member entrench, and does any of it reach user funds?

**Verdict: seats are un-buyable, sybil-resistant, only genuine winners are seated, members can't entrench, and the
contract is non-custodial by construction.** ⚠️ (not 🟢) only because the verdict rests on source + model rather
than a compiled run.

## What the audit verified (from source)

**Score-weighted, NOT token-weighted (the buyability defense).**
- Vote weight = `seer.getScoreAt(voter, electionStartAt)` — a **ProofScore snapshot** frozen at election-start
  time, not token balance. A whale with zero score gets zero weight; pumping score after the election opens
  changes nothing.

**Sybil-resistant eligibility.**
- Both candidate and voter must clear `minCouncilScore` **at the snapshot** (`_eligibleAt(..., electionStartAt)`).
  Fresh default-score vaults can neither vote nor run, so a sybil swarm contributes zero weight.

**Vote-casting guards.** Voting only within `[start, end)`; **no double-voting** (`_hasVoted[epoch][voter]`).

**Only genuine winners are seated (capture resistance).**
- A proposed slate must (a) be a valid size [1, 21], (b) have every member eligible at the snapshot, and (c) have
  every member be an actual top-voted candidate (`_isTopVotedCandidate`) — else it reverts
  `CE_NotTopVotedCandidate`. **An arbitrary set cannot be seated**, even by the DAO.

**Seating is timelocked.** A winning slate becomes `_pendingCouncil` and applies only after
`COUNCIL_APPOINT_DELAY` (72h).

**Term limits (anti-entrenchment).** Hard-coded `FIXED_MAX_CONSECUTIVE_TERMS = 1` (one consecutive term),
`FIXED_TERM = 365d`, `FIXED_REELECTION_COOLDOWN = 365d`. A consecutive re-seat beyond the limit reverts
`CE_TermLimitReached`; re-seating within the cooldown is also limit-checked. A member serves one year, then sits
out — no indefinite incumbency.

**Capture-resistant removal (#503).** `refreshCouncil` is **permissionless** and requires the caller to pass
**all** current council members (not a subset) — so the DAO **cannot selectively purge** a member. Only members
who fall below the current-term score are removed.

**DAO-governed parameters.** `startElection` / `setParams` / `setTermLimits` / module wiring are `onlyDAO` — they
route through the certified DAO → DAOTimelock path, not a rogue admin. Candidate list is capped (M-38,
`CE_TooManyCandidates`) against spam/DoS.

**Non-custodial by construction.** The contract performs **no value transfers anywhere** — ReentrancyGuard is
intentionally omitted with that exact rationale. It holds no user funds and has no freeze/seize.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/CouncilElectionVoting.test.ts` — requires a completed election and top-voted candidates before a
  council proposal; supports >200 registered candidates; keeps seated members through mid-term score changes.
  Wire into the verification harness/manifest alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via `CouncilElectionVoting.test.ts`.
- The `_isTopVotedCandidate` ranking and the term-limit consecutive/cooldown branching were read and modeled at
  the logic level; the exact O(n) ranking implementation and history bookkeeping should be spot-confirmed on a
  compiled build. Nothing found lets a non-winner be seated or a member entrench.
- No new findings.

## Bottom line
CouncilElection is a **ProofScore-weighted, snapshot-frozen, sybil-resistant, term-limited election**: seats can't
be bought, fresh sybils can't vote, only the genuine top vote-getters can be seated (after a 72h timelock), a
member can serve only one consecutive year, and the DAO can't selectively purge members. It is non-custodial by
construction. The invariant holds at this surface as at every other.
