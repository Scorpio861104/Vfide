# DAO.sol — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Gate-audit of `contracts/DAO.sol` (1429 lines) — the proposal/voting core that DAOTimelock executes for, and the
largest governance contract. Method matches the on-chain campaign: **source-level audit + an executable TS
voting/quorum/lifecycle model** run as an adversarial matrix (no solc here — a compiled run is the confirming
step). The repo's governance hardhat suites are the on-chain evidence for a compiler-equipped environment.

- Model: `lib/audit/daoModel.ts`
- Matrix: `__tests__/audit/daoModel.test.ts` — **25 scenarios, all pass**; project typecheck 0.

## Central question
For a governance core: can votes be bought (flash loan / token transfer / score-pump), can a minority pass a
proposal, and can a passed proposal bypass the (already-certified) timelock or reach user funds?

**Verdict: votes are un-buyable, a minority cannot pass, execution routes only through the timelock, and the DAO
is non-custodial.** ⚠️ (not 🟢) only because the verdict rests on source + model rather than a compiled run.

## What the audit verified (from source)

**Score-weighted, NOT token-weighted (the buyability defense).**
- Vote weight = `seer.getScoreAt(voter, scoreDeadline)` — a **ProofScore snapshot**, not token balance. A whale
  with zero score gets zero weight regardless of holdings.
- **DAO-05 FIX**: the snapshot is frozen at **proposal-creation time**, not first-vote time — so pumping score
  after seeing a proposal changes nothing.
- **`votingDelay` = 1 day**: voting cannot start for 24h after creation ("flash loan protection"). Combined with
  the creation-time snapshot, a flash-loan-then-vote (or any just-in-time score pump) gains zero voting power.
- **Governance Fatigue**: weight is reduced for addresses voting too frequently — anti-domination.

**Vote-casting guards.**
- Voting window enforced; votes in the final `VOTE_GRACE_PERIOD` (30 min) are rejected (anti-front-running).
- Eligibility requires `seer.getScoreAt(...) >= seer.minForGovernance()`.
- **No double-voting** (`hasVoted[voter]` → `DAO_AlreadyVoted`); unique `voterCount` tracked (FLOW-2); voter
  history is bounded (I-11, anti-DoS).

**Quorum floor — a minority cannot pass.**
- Pass requires: score-vote `total >= minVotesRequired` (default 5000) **AND** `voterCount >= minParticipation`
  **AND** `forVotes > againstVotes`. Both a vote-point threshold and a unique-participant floor must be met.
- `minVotesRequired` can never go below **`ABSOLUTE_MIN_QUORUM` = 500** (DAO-02) — quorum cannot be cascaded
  down to near-zero.

**Mutual Seer oversight.** Before queueing, a SeerGuardian-blocked proposal reverts (`DAO_ProposalFlagged`) —
Seer can stop a malicious proposal at finalization.

**Timelock-only execution (no bypass).**
- A passed proposal is **QUEUED to the timelock** (`timelock.queueTxFromDAO(target, value, data, id)`) and records
  `queuedAt` (DAO-12); it never self-executes. There is no direct-execution path in the pass flow.
- **DAO-07**: `markExecuted` is `onlyTimelock` — prevents an admin soft-veto and prevents faking execution state.
- **DAO-12**: expired queued proposals cannot execute.
- Parameter setters (`setParams`, quorum/period) are `onlyTimelock` — changing governance params must itself pass
  a proposal → timelock cycle.

**Emergency paths are bounded (relief, not a backdoor).**
- Quorum rescue (deadlock relief, after a long delay) lets the admin only REDUCE `minVotes`, and only to ≥10% of
  current AND ≥ `ABSOLUTE_MIN_QUORUM` (500). It can't be "rescued" up, and it can't collapse quorum.
- Timelock replacement requires a long delay + a secondary approval (DAO-03).

**Non-custodial.** DAO.sol holds no user funds. A passed proposal's only reach is whatever the timelock is admin
of — which the vault/OCP/EmergencyControl architecture bounds away from vault freeze/seize.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/DAOTimelockExecutionFlow.test.ts` — the DAO→timelock execution path (#207/#208/#210/#217/#220).
- `test/hardhat/DAOAdminTransferGuardrail.test.ts` — admin rotation requires pending-accept.
- `test/hardhat/generated/GovernanceHooks.generated.test.ts` — the hooks the DAO fires on queue/finalize.
- Wire into the verification harness/manifest alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via the governance hardhat suites.
- DAO.sol is large (1429 lines). The core voting/quorum/finalize/emergency paths were read and modeled; the
  delegation, history-pruning, and council-sync helpers were read at the surface and traced for fund-reach but
  not every branch to full depth. Nothing found reaches user funds or bypasses the timelock.
- No new findings.

## Bottom line
DAO.sol is a **ProofScore-weighted, snapshot-frozen, flash-loan-resistant governance core**: votes can't be
bought, a minority can't pass (hard quorum + participant floors), no double-voting, Seer can block malicious
proposals, and every passed proposal executes ONLY through the certified DAOTimelock. The non-custodial invariant
holds at this surface as at every other.
