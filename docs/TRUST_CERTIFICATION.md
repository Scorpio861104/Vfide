# Trust — Certification Report

Fourth system outside Commerce through the gate discipline, and the one with the **highest blast radius after
Core Ownership**: ProofScore is the protocol's spine. It prices every transaction (the 5%→0.25% buyer trust
fee), gates discovery visibility, and underlies trust everywhere. It had **never been gate-audited.** Merchant
Trust, Builder Record, and Transparency were partly exercised as discovery inputs in Commerce Phase 5; the new
territory here is ProofScore itself, its fee curve, and Trust Appeals.

**Central adversarial question (for a reputation system that prices fees):** can ProofScore be **bought**
(wealth→score), **farmed/spiked** to dodge fees, or **manipulated** — and if a user is wrongly flagged, can they
be protected and recover?

**Verdict up front:** Trust **holds at the source level** and is, frankly, the most carefully-designed system
I've audited in this campaign — the anti-manipulation and anti-capture reasoning is explicit and layered. I am
marking it **⚠️ CERTIFIED WITH KNOWN BOUNDARIES** for the same compile reason as the other on-chain audits (no
solc here → source audit + 39-scenario executable model), with **no new security findings** — only the standing
methodology boundary and a couple of scope notes.

> ⚠️ **Methodology boundary (as in Core Ownership / Recovery):** source-level audit + executable logic model,
> not an on-chain/compiled test. A compiled hardhat run against the real bytecode remains the required next
> step; the relevant suites exist in-repo for a compiler-equipped environment.

## ProofScore integrity — you cannot buy or set your score
- **It is a weighted aggregate of DAO-authorized SOURCES, not a settable number.** `Seer.sol` holds a
  pluggable score-source registry (`addScoreSource`/`removeScoreSource`, DAO-only, timelocked). Each source
  contributes a bounded value with a weight; **total active source weight can never exceed 100%**
  (`_activeScoreSourceWeight() + weight > 100` reverts), and there is no `setScore(9999)` primitive a user can
  call. An uninitialized address is treated as **NEUTRAL = 5000**, never 0.
- **The underlying signals are behavioral and access-controlled.** `ProofLedger.sol` is an immutable event log;
  only the DAO and explicitly-authorized system contracts (with a timelock on changing loggers) may write
  entries. There is **no wealth / balance / holdings input** — the score type cannot express it, structurally,
  exactly as Discovery (Phase 5) was shown to forbid wealth.
- **Even the DAO is bounded (anti-capture).** A DAO score adjustment is capped at **±5% per call**
  (`maxDAOScoreChange = 500`), and once on-chain sources are registered, on-chain weight cannot be reduced
  below a minimum — the contract comments name this explicitly as preventing "a captured DAO from silently"
  reclaiming full score authority. So neither a user nor a captured governance can trivially seize a score.

## The fee curve — and why it cannot be farmed (the economic-integrity core)
The buyer trust fee runs a continuous linear curve in `ProofScoreBurnRouter.sol`: **≤4000 → 5% (500 bps),
≥8000 → 0.25% (25 bps), linear between** (`_calculateLinearFee`), with the floor/ceiling governance-bounded
(≥10% / ≤95% range). The manipulation defense is the part that matters:

- **The fee uses `getTimeWeightedScore`, not the instantaneous score.** You cannot spike your ProofScore right
  before a transaction to grab the 0.25% rate — the fee is computed against a time-weighted average over a
  window, so a fresh spike doesn't count until it has been *sustained*.
- **It returns `min(liveScore, cachedTimeWeightedScore)` (the H-3 fix).** This is asymmetric in the
  safety-preserving direction: a **score increase only helps after the window**, but a **score DROP (fraud
  flag, decay) raises the fee IMMEDIATELY** — "fee can never be under-charged." A flagged actor pays the max
  fee the instant they're flagged, even before any cache refresh.

This closes the obvious attack (farm score → cheap fees) and the subtle one (race a score update against a
transaction). Demonstrated in matrix E1–E4.

## Trust Appeals — the "non-custodial fairness core"
`FraudJury.sol` is explicitly labeled the NON-CUSTODIAL FAIRNESS CORE, and it answers "can a wrongly-flagged
user be protected?" structurally:
- **A fraud consequence (Seer score penalty + service ban) may ONLY follow a peer-jury CONFIRMATION.** It never
  happens by fiat.
- **The DAO can VETO a case (force Dismissed) but can NEVER confirm one** — the only unilateral authority power
  is *leniency*. For a protocol serving the financially-excluded, that asymmetry is the right one.
- **Conflict exclusion:** the target cannot judge their own case; accusers cannot judge; jurors are score-gated
  (≥7000).
- **Commit-reveal voting** prevents bandwagoning/anchoring.
- **Quorum failure → Dismissed** (fail-safe to leniency): if the jury doesn't show, the accused is NOT punished.
- Confirmation needs **≥5 reveals AND ≥66% supermajority**.

So fraud penalties are not permanent unappealable shadow-bans — consistent with the recovery theme across Core
Ownership and Recovery & Continuity: the system always leaves a path back.

## Merchant Trust (deepened from Phase 5)
`lib/seer/merchantTrust.ts` is a **distinct** operational-trust score (0–100), separate from ProofScore
(0–10000) — an honest separation worth noting so the two aren't conflated. It is bounded and explainable: BASE
55, +15 verified, −20 per upheld dispute, −5 per refund, a confirmed-payment track-record lift **capped at 12**,
clamped to [0,100]. Phase 5 used it as a discovery input; here it's verified as a trust system in its own right
(matrix H1–H7): heavy dispute penalty, capped positive signals (can't be farmed via volume), clamped, itemized.

## The Scenario Matrix — 39 executing scenarios
`__tests__/audit/trustModel.test.ts` over `lib/audit/trustModel.ts` + the real `computeMerchantTrust`:
- **A. Source weighting (A1–A5):** NEUTRAL default, weighted average, inactive excluded, ≤100% cap, clamped.
- **B. No wealth / no direct set (B1–B2).**
- **C. DAO bounded (C1–C4):** ±5%/call, can't jump to max, clamps.
- **D. Fee curve (D1–D5):** 5% at ≤4000, 0.25% at ≥8000, monotonic, capped.
- **E. Fee anti-gaming (E1–E4):** **spike doesn't lower fee immediately; a flag raises it immediately;**
  sustained high earns the low fee; pre-tx farming fails.
- **F. Jury eligibility (F1–F4):** score-gated, target/accuser excluded.
- **G. Jury fairness (G1–G8):** quorum-failure→Dismissed, supermajority→Confirmed, DAO can veto but not
  confirm, only the jury confirms.
- **H. Merchant Trust (H1–H7):** BASE/bonus/penalties, clamped, capped track-record, explainable.

Full regression green (all four audit matrices total 150); typecheck 0.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ Seer (aggregation) + ProofLedger (event log) + BurnRouter (fee curve) + FraudJury (appeals) + merchantTrust mapped |
| Functional | ✅ score aggregation, fee curve, jury lifecycle modeled |
| Edge-Case | ✅ NEUTRAL default, clamps, weight cap, DAO bound, time-window behavior |
| Adversarial | ✅ no buy-score, no fee-farming, no DAO capture, no self-judging jury — all closed |
| Integration | ✅ ProofScore → fee (time-weighted) → discovery (Phase 5); FraudJury → Seer penalty; ProofLedger events |
| Grandmother | ✅ fee is lower if you're trustworthy and you can't be punished without a peer jury that defaults to mercy |
| **Trust (source + logic model)** | ✅ **HOLDS — no new findings** |
| **On-chain / compiled re-verification** | ⚠️ **not executed here (documented boundary)** |

## Residual honesty notes
- "Verified" = source-read + executable logic model, not on-chain execution (standing campaign caveat). A
  compiled hardhat run of these invariants is the required next step.
- **The actual score SOURCES were not enumerated/audited** — Seer aggregates whatever DAO-authorized
  `IScoreSource` contracts are registered, and this audit verified the *aggregation, bounds, and anti-capture
  governance*, not the internal scoring logic of each individual source (those are separate contracts, some not
  yet deployed). A complete pass should audit each registered source's contribution logic for its own gaming
  surface.
- **FraudRegistry.sol** (783 lines — the contract that consumes a jury Confirmation into a risk signal + score
  penalty + escrow) was read at its interface boundary (consequence-only-after-Confirmed) but not to full
  depth; it's a candidate for a focused pass, especially its 30-day escrow and non-custodial guarantees.
- **Builder Record** (`marketStability/builderRecord.ts`) was capped/exercised in Phase 5 and noted here but
  not separately re-audited; **Trust Transparency** (`merchantTransparency.ts`) likewise. Both are 🟡 (partially
  validated via Discovery), not independently gate-certified.

## Tracker impact
Trust moves 🟡 → ⚠️ (ProofScore / fee curve / appeals / merchant trust source-certified; individual score
sources + FraudRegistry depth are noted follow-ups). Next per the tracker: **Governance** (DAO / Voting /
Treasury / Appeals / Oversight) — and the cert flags `EmergencyControl.sol` for specific scrutiny against the
non-custodial invariant.
