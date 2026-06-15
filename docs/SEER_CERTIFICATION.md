# Seer — Certification Report

Seventh system through the gate discipline. Seer is VFIDE's autonomous intelligence layer — scoring, ranking,
pattern detection, and **enforcement**. It carried a flag analogous to (and arguably sharper than) the
EmergencyControl one from Governance: Seer is an **anti-extraction surveillance/enforcement system** whose
restriction levels escalate through `None → Monitored → Limited → Restricted → Suspended → Frozen` and whose
action types include `VaultWithdraw`. A "fully autonomous self-triggering enforcement system" with a "Frozen"
state and a withdraw-action type is exactly the thing that must be *proven* not to reach user funds — because
the whole protocol thesis is non-custodial.

**Central question:** does Seer's autonomous power stay BOUNDED, NON-CUSTODIAL, and APPEALABLE — i.e. can any
Seer consequence freeze, seize, or block a user's funds?

**Verdict up front:** Seer **holds**, with **no new findings**. The headline result, verified directly against
the live vault code: **the one place Seer is wired into the fund path observes the action and deliberately
discards the verdict** — Seer can never block a withdrawal, payment, or transfer. Every Seer consequence lands
on reputation/fee/visibility/discretionary-services, never fund movement. Much of Seer was also already covered
(Discovery/Visibility in Commerce Phase 5; score aggregation + fee anti-gaming in Trust; endorsements in Social),
so this pass focused on the **enforcement boundary** and the **market-stability engines** (Risk / Incentive /
Opportunity). Marked **⚠️ CERTIFIED WITH KNOWN BOUNDARIES** — the off-chain engines are real and were exercised
directly (no boundary there); the on-chain SeerAutonomous/PolicyGuard enforcement is source-read (compiled run
folds into the Seer/Trust hardhat pass).

## The crux — Seer's autonomous verdict is NEVER enforced on funds (verified in source)
`CardBoundVault._enforceSeerAction` (lines 2092–2105) is the only place Seer touches the fund path. It is called
at every fund-movement point (transfer line 1585, pay line 1662), and its body is unambiguous:

> *"NON-CUSTODIAL INVARIANT: the system can never freeze or seize a user's funds. Seer is advisory/monitoring
> only — its verdict is intentionally NOT enforced here, so a vault operation (payment, withdrawal, escrow
> funding) can never be blocked. The call is retained so Seer still observes/tracks the action; punishment, if
> any, occurs through the Seer score → fee curve, never by halting fund movement."*

Mechanically: it calls `seerAutonomous.beforeAction(...) returns (uint8)` and **discards the returned verdict**
(empty body). And the call is wrapped in a `try/catch` (SEER-04 fix): a Seer **hook outage cannot brick vault
operations** — a revert is caught and the operation proceeds. So at every restriction level, including
**Frozen**, and even when Seer is down, a user's funds move. This is the mirror of the EmergencyControl
finding: a scary-sounding power that, on inspection, has no path to user funds.

What Seer's restrictions *can* reach: protocol-participation (governance/trading/staking/endorsing on VFIDE
surfaces) and reputation/fee. Severe restrictions are **appealable** — a subject can `challengeRestriction`, the
**DAO** (not Seer, not an accuser) resolves it via `resolveChallenge` within a challenge window, and threshold/
policy changes are DAO-only and **timelocked** (SeerPolicyGuard classifies changes Critical/Important/
Operational with per-class delays — nothing is instant).

## Risk engine — `extractionIndex.ts` (read-only, behavioral, decaying)
A pure metric (0–10000) over **behavioral** signals — high-impact sells, sell-rebuy cycles, rapid rebuys,
volatility events, liquidity disruptions, and a multi-wallet cluster-correlation hint. Categories: Normal /
Observed / Elevated / High Risk / Extraction Focused (thresholds 1000/3000/5000/7000). Two properties matter and
were exercised on the **real function**:
- **It keys on behavior, not wealth** — a wealthy but clean actor sits in Normal (matrix H1); a single large
  sell with no fraud/disputes does NOT make someone a "scammer-exit" (H2).
- **Nobody is permanently punished** — the index **decays 50% every 90 days** (continuous, smooth), so standing
  rehabilitates: an Extraction-Focused (8000) index decays back to Normal over ~a year (H3).

## Opportunity/Stability engine — `stabilityPolicy.ts` (the non-custodial guarantee, in the type system)
`evaluateStabilityPolicy` is where extraction risk becomes consequences — and the non-custodial guarantee is
enforced at the **TypeScript type level**: `StabilityDecision.tokenTransferEffect` is the literal type
`'none — ownership is sovereign; the flat AntiWhale limit applies equally to all'`. The engine *cannot* emit a
transfer block. Verified on the real function (matrix F1–F5, H1–H2):
- Even a **high-extraction, fraud-flagged** actor has `tokenTransferEffect: none` (F2).
- Consequences are **discretionary VFIDE-service-side**: a lending pause ("your own tokens are unaffected"), a
  marketplace **visibility multiplier**, and **emergency relief eligibility** (gated on proofScore ≥ 6000 +
  builder protection ≥ 0.5 + extraction < 3000 + not-used-in-12-months).
- The "scammer-exit" restriction keys on **verified disputes/fraud + low trust + high extraction**, never on
  wealth or a single sell. Builders get *softened* friction (protection tiers 1.0 → 0.5).

## Incentive engine — `stabilityBonding.ts` (opt-in, on-chain-verified, unfarmable, non-custodial)
`computeBondBenefits` rewards a **voluntary** lock of the user's *own* tokens. Verified on the real function
(matrix G1–G5):
- **Opt-in:** no bond → no benefits; you were never required to participate.
- **Unfarmable / anti-spoof:** an **unverified (client-claimed) bond grants ZERO benefits** — the off-chain
  layer reads `verifiedOnChain` and never trusts a self-reported bond (G2). An expired/matured bond also grants
  nothing (G5).
- **Bounded:** benefits cap out (≤30% fee reduction, ≤25% lending boost, ≤0.3 visibility, ≤1000 Builder points),
  scaled by term (3/6/12/24 months → 0.25/0.5/0.75/1.0).
- **Non-custodial by design:** the documented `IStabilityBond` interface notes tokens **release only back to the
  owner at maturity** and **"NO function lets any third party (DAO included) move or seize a bonded balance."**
  An early-withdrawal lock is non-custodial *because the participant opted into the term* — a restriction you
  chose, not one imposed on a non-consenting holder.

## The Scenario Matrix — 36 executing scenarios
`__tests__/audit/seerModel.test.ts` — boundary model (`lib/audit/seerModel.ts`) + the REAL engines imported and
run directly:
- **A. Verdict-never-enforced (A-block):** vault op proceeds under every verdict and on Seer outage.
- **B. Participation scope:** restrictions bite participation, never fund movement.
- **C. Challenge/appeal:** subject raises, DAO resolves.
- **D. DAO-bounded + timelocked thresholds/policy.**
- **E. REAL extraction engine:** category thresholds, decay, extractive-signal response, clean→Normal.
- **F. REAL stability policy:** `tokenTransferEffect: none` even for high-extraction/fraud; discretionary
  lending pause; eligibility-gated relief; builder visibility.
- **G. REAL bonding:** opt-in, unverified→no benefit, term-scaled, expired→no benefit.
- **H. Behavior-not-wealth + recovery:** wealthy-clean unaffected; verified-acts-required; standing rehabilitates.
- **I. Boundary holds for every level incl. Frozen + on outage.**

Full regression green (full audit suite total 255 across 9 suites); typecheck 0.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ SeerAutonomous boundary + extractionIndex + stabilityPolicy + stabilityBonding mapped |
| Functional | ✅ enforcement boundary modeled; risk/opportunity/incentive engines run directly |
| Edge-Case | ✅ decay, expiry, eligibility gates, category thresholds |
| Adversarial | ✅ **no Seer verdict can block funds (any level, incl. Frozen); behavior-not-wealth; unverified bond = 0; standing decays** |
| Integration | ✅ Seer score → fee (Trust); Seer eligibility → governance (Governance); discovery/visibility (Phase 5); vault ignores Seer verdict (Core Ownership boundary) |
| Grandmother | ✅ Seer can lower your reputation or your VFIDE-service perks, but it can never touch the money in your wallet — and a wrong call is appealable to humans |
| **Seer (engines run + boundary source-modeled)** | ✅ **HOLDS — no new findings** |
| **On-chain SeerAutonomous/PolicyGuard compiled re-verification** | ⚠️ **not executed here (documented boundary)** |

## Residual honesty notes
- The **market-stability engines were exercised directly** as runnable pure functions (strong evidence). The
  **on-chain SeerAutonomous.sol / SeerPolicyGuard.sol** enforcement logic was **source-read** here; a compiled
  hardhat run (the verdict-ignored wiring, restriction-level transitions, challenge/resolve, policy timelocks)
  is the required next step and folds into the Seer/Trust on-chain pass already flagged.
- **`marketImpact.ts`, `swapClassification.ts`, `lendingPolicy.ts`, `merchantAdvisor.ts`** are additional
  market-stability/advisory engines read at the boundary but not exhaustively exercised — candidates for a
  follow-up; none has a fund-movement path (they feed lending/visibility/advice).
- **`SeerWorkAttestation.sol`** (work-attestation) and the **Forecasting** surface were not audited here; the
  taxonomy's "Forecasting" appears to be advisory/display and was not found to feed a fund or score-write path,
  but that should be confirmed in a dedicated read.
- "Verified" for the on-chain boundary = source-read + executable model; for the TS engines = real function
  execution. Neither is a live-mainnet observation.

## Tracker impact
Seer moves 🟡 → ⚠️ (enforcement boundary + risk/incentive/opportunity engines certified; SeerAutonomous compiled
run + marketImpact/swap/lending/advisor/WorkAttestation depth = follow-ups). **This completes 8 of the 9 systems
groups.** The last is **Developer Platform** — which per the tracker must FIRST be confirmed to exist (no
sdk/packages dir was found; APIs may be the de-facto surface) before it can be treated as a certifiable system.
