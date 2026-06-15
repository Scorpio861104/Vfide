# AdminMultiSig.sol — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Gate-audit of `contracts/AdminMultiSig.sol` (587 lines) — the remaining unaudited Oversight contract and the
natural companion to OwnerControlPanel. Method matches the on-chain campaign: **source-level audit + an
executable TS authorization model** run as an adversarial matrix (no solc here — compiled run is the confirming
step). The repo's `AdminMultiSigSecurity` hardhat suite is the on-chain evidence for a compiler-equipped env.

- Model: `lib/audit/adminMultiSigModel.ts`
- Matrix: `__tests__/audit/adminMultiSigModel.test.ts` — **26 scenarios, all pass**; project typecheck 0.

## Central question
AdminMultiSig is the protocol's 3/5 council multisig, and its `executeProposal` makes a low-level
`target.call{gas}(data)`. The audit's job: is that arbitrary call BOUNDED, is the threshold sound, can the
council capture itself, and does it reach user funds?

**Verdict: the call is bounded on every axis; the multisig is non-custodial.** It can only call pre-allowlisted
(target, selector) pairs, only after 3/5 (or 4/5 emergency) approvals + a type-based timelock + surviving a
ProofScore-gated community veto window, and it holds no user funds and exposes no freeze/seize. ⚠️ (not 🟢) only
because the verdict rests on source + model rather than a compiled run.

## What the audit verified (from source)

**The arbitrary call is allowlist-bounded (the crux).**
- `createProposal` requires BOTH `proposalTypeTargetAllowed[type][target]` AND
  `proposalTypeSelectorAllowed[type][selector]` (selector extracted from calldata) — else it reverts. The
  multisig can never be pointed at an arbitrary contract/function; only pre-approved pairs.
- **#406 FIX**: the target allowlist is **re-verified at execution time**, so a de-allowlisted target can't be
  called even if it was allowed when proposed.
- Changing the allowlist (`setProposalTypeTargetAllowed` / `setProposalTypeSelectorAllowed`) is itself a
  self-governed proposal — it goes through the same 3/5 + timelock + veto flow.

**Threshold is sound.**
- 3/5 for CONFIG/CRITICAL, **4/5 for EMERGENCY**; the proposer auto-counts as 1. A lone member (or a pair)
  cannot pass a proposal; emergency needs four of five.

**Timelock + community veto + expiry gate the call.**
- Type delays: CONFIG 24h, CRITICAL 48h, EMERGENCY 1h. Execution before `executionTime` reverts.
- Non-emergency proposals must execute within a **24h post-timelock veto window** — giving the community time to
  veto; `vetoCount >= vetoThreshold` (100) blocks execution.
- Proposals **expire after 30 days** (#407: can't even be approved once expired).
- Gas-limited call (`executionGasLimit` ∈ [100k, 10M]); **H-09**: a bool-returning call (ERC-20 transfer) must
  return `true`, so a soft-fail transfer can't pass silently.

**Community veto is sybil-resistant and un-buyable (M-6 / N-M21 / H-10).**
- Primary gate is **ProofScore ≥ 5000** (`seer.getCachedScore`), so a fresh default-score vault can't veto.
- In production (seer set), **both** reputation AND stake are required — veto power can't be bought with tokens
  alone, and reputation can't be faked cheaply.
- **H-10**: no permissionless veto when the gates are unconfigured.

**Self-governance — no lone member can change anything; council can't be minority-captured.**
- Every parameter setter is `onlyProposalExecutionContext` (**#409**: `msg.sender == address(this)` + an active
  proposal) — so a council member can't directly change veto params, gas limit, or allowlists.
- `updateCouncilMember` is `onlyEmergencyProposalExecutionContext` — replacing a seat needs a **4/5 EMERGENCY
  proposal**; rejects zero address, out-of-range index, and duplicate members.

**Non-custodial.**
- AdminMultiSig holds no user funds. Its allowlisted reach can only do to a vault what the vault/OCP architecture
  already permits any owner to do — which **excludes freeze/seize** (see the Core Ownership, OCP, and
  EmergencyControl certs). It is not a custody backdoor.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/AdminMultiSigSecurity.test.ts` — rejects EOA targets at creation; reverts when execution fails;
  blocks community veto when no gate is configured; rejects no-op VFIDE token updates; governance can update the
  veto threshold. Wire into the verification harness/manifest alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via `AdminMultiSigSecurity.test.ts`.
- The security of the bounded call depends on the **allowlist being curated conservatively** at deployment/
  governance time: the invariant "can't reach user funds" holds because no (target, selector) pair that could
  freeze/seize a vault exists in the architecture — but operators must not allowlist a dangerous pair. This is
  an operational discipline, not a code gap.
- No new findings.

## Bottom line
AdminMultiSig is a **constrained, allowlisted 3/5 council multisig** with type-based timelocks, a ProofScore-
gated sybil-resistant community veto, 30-day expiry, airtight self-governance, and no fund custody. The
low-level call is bounded on every axis. The non-custodial invariant holds at this surface as at every other.
