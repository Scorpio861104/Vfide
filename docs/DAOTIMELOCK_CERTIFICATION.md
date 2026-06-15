# DAOTimelock.sol — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Gate-audit of `contracts/DAOTimelock.sol` (705 lines) — the timelock that backs DAO governance (queue → wait
`delay` → execute). Method matches the on-chain campaign: **source-level audit + an executable TS timing/
authorization model** run as an adversarial matrix (no solc here — a compiled run is the confirming step). The
repo's `DAOTimelockExecutionFlow` hardhat suite is the on-chain evidence for a compiler-equipped environment.

- Model: `lib/audit/daoTimelockModel.ts`
- Matrix: `__tests__/audit/daoTimelockModel.test.ts` — **25 scenarios, all pass**; project typecheck 0.

## Central question
A timelock's whole value is that a queued action **cannot execute before its delay** and the delay **cannot be
collapsed to bypass it**. `execute` makes a low-level `target.call`, so the audit confirms the call is bounded by
timing + state, the delay has a hard floor, and none of it reaches user funds.

**Verdict: the timelock guarantee holds and cannot be bypassed; non-custodial.** ⚠️ (not 🟢) only because the
verdict rests on source + model rather than a compiled run.

## What the audit verified (from source)

**Core execution guarantee.** `execute` requires, in order: the op is queued (`eta != 0`), not already executed
(`op.done` → `TL_AlreadyExecuted`, TL-02), not expired (`block.timestamp <= eta + EXPIRY_WINDOW`, 7 days, H-15),
and the delay elapsed (`block.timestamp >= eta`). `op.done` is set **before** the external call
(checks-effects-interactions) and the function is `nonReentrant`. No execution-before-delay; no double-execution.

**Risk lengthens, never shortens.** When PanicGuard signals global risk, execution needs an EXTRA 6h
(`eta + 6h`) — risk only ever *delays* execution. The risk check **fails open** (a PanicGuard outage returns
`false`), so a monitoring outage can't brick `execute` (matches on-chain #220).

**Delay floor — no bypass (the crux).**
- `setDelay` is `onlyTimelockSelf` (changeable only through a queued+delayed call) and bounded: effective floor
  `ABSOLUTE_MIN_DELAY` = 24h, ceiling `MAX_DELAY` = 30d (C-1 fix).
- `emergencyReduceDelay` is the only admin-direct delay change, and it is tightly bounded: can only REDUCE,
  never below 24h, **at most 50% per call**, with a **24h cooldown**, and is **one-shot** until a 30-day reset.
  A malicious admin can at most halve the delay once (floored at 24h) — the timelock can never be zeroed.

**Self-governed parameters.** `admin` / `delay` / `secondaryExecutor` / `ledger` / `panicGuard` change ONLY via
`onlyTimelockSelf` (a queued+delayed call routed through the timelock) — even the admin cannot set them directly.

**Secondary executor adds delay, never rushes.** A backup executor exists for liveness (if the primary admin
can't execute), but it must wait an EXTRA 3 days (`eta + SECONDARY_EXECUTOR_DELAY`) and is still expiry-bounded —
it can never accelerate execution.

**Requeue restarts the clock.** `requeueExpired` (admin-only) works ONLY on a genuinely expired op and gives the
re-queued tx a FRESH full delay (`eta = now + delay`, unique nonce, FLOW-4) — an expired action cannot be
instantly re-sprung.

**Permissionless carve-out is tiny.** A non-admin may execute ONLY a queued self-`setAdmin` call (#208 — a
deadlock-recovery path if the bootstrap admin key is lost after queueing the rotation). Nothing else is
permissionlessly executable.

**Non-custodial.** DAOTimelock holds no user funds; its `target.call` reach is whatever it is admin of, which the
vault/OCP/EmergencyControl architecture bounds away from vault freeze/seize.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/DAOTimelockExecutionFlow.test.ts` — #208 permissionless self-setAdmin execution; #207 ripe vs
  not-yet-ripe execution; #210 requeueExpired preserves DAO proposal tracking; #217 setDelay enforces the
  ABSOLUTE_MIN_DELAY floor; #220 execute does not brick when `panicGuard.globalRisk` reverts. Wire into the
  verification harness/manifest alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via `DAOTimelockExecutionFlow.test.ts`.
- As with AdminMultiSig, the timelock's bounded call is only as safe as **what it is made admin of**: the
  "can't reach user funds" property holds because the architecture has no admin-callable vault freeze/seize, not
  because the timelock filters targets. Operators must not make the timelock admin of a contract that could.
- No new findings.

## Bottom line
DAOTimelock is a **textbook-correct, well-hardened timelock**: queued actions can't execute early (risk only
extends the wait, fail-open on outage), can't execute past the 7-day expiry, can't double-execute; the delay is
floored at 24h and can't be collapsed; its own parameters change only through itself; the backup executor adds
delay rather than removing it; and re-queuing an expired op restarts the full delay. The non-custodial invariant
holds at this surface as at every other.
