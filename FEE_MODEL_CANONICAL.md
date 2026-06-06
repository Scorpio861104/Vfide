# VFIDE Fee Model — Canonical Reference

**Status:** Authoritative. Supersedes all fee-split numbers stated in
`V1_SCOPE.md`, `WHITEPAPER.md`, the Complete Manual, and any contract
NatSpec/comment that disagrees. **Ground truth is the contract code cited
below; if this doc and the code ever diverge, the code wins and this doc is
wrong.**

**Verified against:** `contracts/ProofScoreBurnRouter.sol`,
`contracts/FeeDistributor.sol`, `contracts/MerchantPortal.sol`,
`contracts/lib/ScoringConstants.sol` (repo snapshot 2026-06-03).

---

## 0. The one-paragraph version

Merchants pay **zero** protocol fee. The only fee is a per-transfer fee on the
VFIDE token, sized by the sender's ProofScore: **5% at the bottom of the trust
range, 0.25% at the top, linear in between.** Whatever fee is collected is then
split **40% burned / 10% to Sanctum / 50% to the ecosystem**, and that 50%
ecosystem slice is further split **50% DAO payroll / 30% merchant pool / 20%
headhunter pool.** Nothing about this gives any party a claim on user principal.

---

## 1. Two different things people call "the split"

Every drifted doc in this repo conflated these. They are not the same number
and must always be named distinctly.

**(A) The fee CURVE — *how much* fee is taken.**
A single total fee, in basis points, that varies with the sender's ProofScore.
This is the only thing the user ever "pays."

**(B) The fee DISTRIBUTION — *where* the collected fee goes.**
Once a fee is taken, it is divided into burn / Sanctum / ecosystem, and the
ecosystem slice is divided again. This does not change how much the user pays;
it only routes what was already taken.

A statement like "the split is 40/10/50" is about (B). A statement like "the
fee is 5%" is about (A). Never merge them into one sentence without labeling
which is which.

---

## 2. The fee curve (A) — how much

Implemented in `ProofScoreBurnRouter._calculateLinearFee` and bounded by
`minTotalBps` / `maxTotalBps`.

| Sender ProofScore | Total fee | Source |
|---|---|---|
| ≤ 4000 (`LOW_SCORE_THRESHOLD`) | **5.00%** (`maxTotalBps = 500`) | `ProofScoreBurnRouter.sol` L175, L647–648 |
| 5000 (`NEUTRAL`) | ~4.41% (interpolated) | L656–662 |
| ≥ 8000 (`HIGH_SCORE_THRESHOLD`) | **0.25%** (`minTotalBps = 25`) | `ProofScoreBurnRouter.sol` L173, L650–651 |

Between 4000 and 8000 the fee is a straight linear interpolation:
`fee = 500 − ((score − 4000) × 475) / 4000` bps (L656–662). A daily/volume
multiplier (`getVolumeMultiplier`) can scale this but is re-clamped to stay
within `[minTotalBps, maxTotalBps]` (L668–674).

> **Readability landmine (not a bug):** the NatSpec at L159/L161 writes
> "≤4000 pays max fee (40%)" and "≥8000 pays min fee (80%)". The `(40%)` and
> `(80%)` are the **score** expressed as a percentage of 10000 — NOT the fee.
> The fee is 5% / 0.25%. Recommend rewording these comments to remove the
> ambiguous parenthetical, because every reader misreads it as a fee.

---

## 3. The fee distribution (B) — where it goes

### 3.1 First split: ProofScoreBurnRouter (whole fee → burn / Sanctum / ecosystem)

Hardcoded in the hot path at `ProofScoreBurnRouter.sol` L838–839 and mirrored
in the `getEffectiveBurnRate` view at L1210–1212:

| Channel | Share of total fee | Source |
|---|---|---|
| Burn | **40%** | `burnAmount = (totalFee * 40) / 100;` L838 |
| Sanctum | **10%** | `sanctumAmount = (totalFee * 10) / 100;` L839 |
| Ecosystem | **50%** (remainder) | `ecosystemBps = totalBps − burnBps − sanctumBps;` L1212 |

### 3.2 Second split: FeeDistributor (the 50% ecosystem slice only)

Default `feeSplit` set in the constructor at `FeeDistributor.sol` L206. Note
the header comment in this file is correct; burn and Sanctum are explicitly
**not** re-applied here (L14–16).

| Channel | Share of ecosystem slice | Source |
|---|---|---|
| DAO payroll | **50%** (`daoPayrollBps = 5000`) | `FeeDistributor.sol` L206 |
| Merchant pool | **30%** (`merchantPoolBps = 3000`) | L206 |
| Headhunter pool | **20%** (`headhunterPoolBps = 2000`) | L206 |

Constraints: each channel ≤ `MAX_SINGLE_BPS = 6000` (60%); all three must sum
to exactly `MAX_BPS = 10000`; changes are DAO-governed behind a 72-hour
timelock (`FeeDistributor.sol` L23–25, L278–289).

---

## 4. End-to-end effective split (the number to quote publicly)

Composing §3.1 and §3.2, of **every unit of fee collected**:

| Destination | Math | Effective share |
|---|---|---|
| Burn | 40% | **40%** |
| Sanctum | 10% | **10%** |
| DAO payroll | 50% × 50% | **25%** |
| Merchant pool | 50% × 30% | **15%** |
| Headhunter pool | 50% × 20% | **10%** |
| **Total** | | **100%** |

This — **40 / 10 / 25 / 15 / 10** — is the only five-channel breakdown that
matches the code. Any doc stating "35/20/20/15/10" or "35/20/15/20/10" is
describing a superseded design and must be corrected to this.

---

## 5. Merchant fee

`MerchantPortal.protocolFeeBps` is a `constant 0` (`MerchantPortal.sol` L285).
Merchants are never charged a protocol fee. This is load-bearing for the Howey
posture and must not become non-zero without re-running that analysis.

---

## 6. Known internal inconsistency to resolve (flag for cleanup)

`ProofScoreBurnRouter` declares three public constants that **do not match the
live 40/10/50 distribution**:

```
DEFAULT_BURN_BPS      = 150  // "1.5% base burn"     L142
DEFAULT_SANCTUM_BPS   = 5    // "0.05% base Sanctum"  L144
DEFAULT_ECOSYSTEM_BPS = 20   // "0.2% base Ecosystem" L146
baseBurnBps/baseSanctumBps/baseEcosystemBps alias these  L149–153
```

These (150/5/20) are **not** the percentages applied to collected fees — the
hot path uses the hardcoded 40/10 at L838–839. They appear vestigial. An
external auditor will stop on this and ask which is authoritative.

**Action:** either (a) delete the unused `DEFAULT_*` / `base*` constants and the
`PolicySet` plumbing that references them if nothing reads them, or (b) if they
*are* read somewhere, document precisely what they govern and rename them so
they can't be mistaken for the distribution. Until resolved, this is the single
most likely thing to make a reviewer distrust the fee accounting.

---

## 7. Docs to correct so they stop contradicting this file

- `V1_SCOPE.md` — states FeeDistributor splits "5 channels (35/20/15/20/10)".
  Wrong on both count and numbers. FeeDistributor splits **3** channels
  (50/30/20) of the ecosystem slice; the **5-channel** view is the composed
  end-to-end split in §4 (40/10/25/15/10).
- `WHITEPAPER.md` / Complete Manual — reconcile any fee-split table to §4.
- Contract NatSpec — fix the L159/L161 score-vs-fee parenthetical (§2) and the
  `DEFAULT_*` constants (§6).
