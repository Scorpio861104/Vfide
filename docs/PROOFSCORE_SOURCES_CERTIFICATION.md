# ProofScore (per-source) — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Depth gate-audit of the ProofScore SOURCE machinery in `contracts/Seer.sol` — how each individual input feeds the
score (registration, weighting, aggregation, the automated behavioral component, and the DAO override bound). The
high-level Trust cert established the score "can't be bought or set"; this pass audits the individual sources that
back that claim. Method matches the on-chain campaign: **source-level audit + an executable TS model** run as an
adversarial matrix (no solc here — a compiled run is the confirming step). The repo's Seer / ProofScore hardhat
suites are the on-chain evidence for a compiler-equipped environment.

- Model: `lib/audit/proofScoreSourcesModel.ts`
- Matrix: `__tests__/audit/proofScoreSourcesModel.test.ts` — **21 scenarios, all pass**; project typecheck 0.

## Central question
ProofScore (0-10000, NEUTRAL=5000) is the protocol's spine — every governance and election audit relies on it
being UN-BUYABLE (votes and council seats are ProofScore-weighted). So: can any individual source be bought or
made to dominate, is wealth ever an input, can a rogue DAO capture the score, and is the aggregation correct?

**Verdict: the score cannot be bought — not by holding tokens (no wealth input), not via a single dominant source
(weight cap), not by DAO fiat (bounded), and not by a captured DAO (decentralization floor).** ⚠️ (not 🟢) only
because the verdict rests on source + model rather than a compiled run.

## What the audit verified (from source)

**Bounded per-source weight, sum capped at 100%.**
- `addScoreSource` (onlyDAO) rejects any single `weight > 100` AND rejects any addition where
  `_activeScoreSourceWeight() + weight > 100` — so the **sum of all active source weights can never exceed 100%**.
  No single source can dominate beyond its weight. Source count is capped (`MAX_SCORE_SOURCES`); duplicates and
  the zero address are rejected; removal uses swap-and-pop (M-6, no ghost slots).

**Anti-capture decentralization floor.**
- `setDecentralizationWeights` requires `daoWeight + onChainWeight == 100`, and **once active community sources
  are registered, the on-chain weight cannot be reduced below `MIN_ONCHAIN_WEIGHT_WITH_SOURCES`** — a captured DAO
  cannot silently reclaim full score authority after community reputation infrastructure is deployed.

**Weighted-average aggregation, neutral default, clamped, fault-tolerant.**
- `calculateOnChainScore` blends active sources (each contributing `score×10×weight`, scaling a source's 0-1000
  range to 0-10000) with the automated behavioral score, which fills any remaining weight to 100%.
- Unknown / un-sourced subjects return **NEUTRAL** (5000), never 0. Zero total weight → NEUTRAL.
- The result is clamped to `[MIN_SCORE, MAX_SCORE]` — no out-of-band score.
- A source that **reverts is skipped** (try/catch); a source returning a value **> 1000 is ignored** — a
  misbehaving or malicious source cannot poison the aggregate.

**Behavioral-only automated score (no wealth).**
- `calculateAutomatedScore` starts at NEUTRAL and adds purely behavioral/reputational bonuses: **vault existence**
  (+500 — that you have a vault, not how much is in it), **earned badges** (`_calculateBadgeBonus`), and
  **decaying peer endorsements** (`_calculateEndorsementBonus`). There is **no `balanceOf`, no wealth, no
  token-amount input anywhere**. Holding more tokens does not raise the score. Clamped to MAX_SCORE.

**Even the DAO's direct setScore is bounded.**
- `setScore` (onlyDAO, for migrations/rectifications) is clamped to range (F-64, no sub-floor), **rate-limited to
  1 change per hour per subject** (S-04, `DAO_SCORE_COOLDOWN`), and **magnitude-capped per call** (F-16:
  `delta > maxDAOScoreChange` reverts) — no instant trust manipulation.

## On-chain evidence (run with solc to confirm)
- The Seer / ProofScore hardhat suites (score-source registration weight bounds, decentralization floor, neutral
  default, behavioral aggregation, DAO setScore cooldown/cap). Wire into the verification harness/manifest
  alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via the Seer hardhat suites.
- This audit covers the SOURCE FRAMEWORK (registration, weighting, aggregation, automated behavioral inputs, DAO
  bound). The internal scoring logic of each *individual external source contract* (whatever a given
  `IScoreSource` returns from `getScoreContribution`) is out of scope here — the framework bounds and sanitizes
  whatever they return (weight cap, ≤1000 guard, try/catch), but each deployed source should be audited on its
  own before being added by the DAO. **NOTE (verified):** as of this audit there are ZERO external `IScoreSource`
  implementations in the tree — the only `getScoreContribution` is the interface declaration in Seer.sol. So
  "audit each source before the DAO adds it" is a **process gate for a future deployment**, not a present backlog
  item — there are no source contracts to audit yet. This is the intended trust boundary: sources are pluggable
  but bounded, and none has been written.
- No new findings.

## Bottom line
ProofScore is **un-buyable by construction**: per-source weights are bounded and sum-capped at 100%, the
community (on-chain) portion can't be captured away, the automated component is purely behavioral with **no wealth
input**, unknown users default to neutral, the aggregate is clamped and immune to a misbehaving source, and even
the DAO's direct override is rate- and magnitude-limited. This is the foundation the entire governance/election
campaign rests on — votes and seats weighted by a score that money cannot buy.
