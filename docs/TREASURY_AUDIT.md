# Treasury — Capability Certification (Backend Completion Campaign 6)

**Wave B.** Full certification of VFIDE's fee/treasury machinery: the ProofScore fee curve, the 40/10/50 primary
split, the sub-splits, where fees accrue, and who can move treasury funds. Models:
`lib/audit/feeTreasuryModel.ts` (new — curve + primary split) building on `lib/audit/treasuryModel.ts` (existing —
vault drain-resistance). Matrix: `__tests__/audit/treasuryFee.test.ts` (**154 scenarios**) + the existing
`treasuryModel.test.ts` (20) = **174 scenarios; all pass; typecheck 0; full audit suite 1512/34 green**. Target
(150+) met.

## Fee curve & split (verified from `ProofScoreBurnRouter`)
- **Curve (CURVE-*, SWEEP-*, MONO-*, FINE-*):** score ≤4000 → **5%** (maxTotalBps 500); score ≥8000 → **0.25%**
  (minTotalBps 25); 4000–8000 → linear `500 - (scoreAboveLow*475)/4000`. The curve is **monotonically
  non-increasing** in score (more trust never costs more) and uses the **time-weighted** score (a buyer cannot
  pump trust to dodge a fee). A **micro-tx fee ceiling** caps low-value daily commerce (MICRO-*). Integer flooring
  keeps the fee at 5% for scores 4000–4008 until the reduction reaches 1 bps (CURVE-floor-*) — characterized, not a
  bug.
- **Primary split 40/10/50 (SPLIT-*, E2E-*, CONS-*):** `burn = totalFee*40/100`, `sanctum = totalFee*10/100`,
  `ecosystem = totalFee - burn - sanctum`. Because ecosystem is the **remainder**, the three shares sum to the
  total fee **exactly** for every amount tested (1 → 7,777,777), the ecosystem share absorbs all rounding (never
  under-allocates), no share is ever negative, and the fee never exceeds 5% of the transacted amount. Aggregate-fee-
  first computation explicitly avoids BPS-share rounding drift.
- **Destinations:** burn → **address(0)** (true irreversible burn — BURN-01), sanctum → SanctumVault (DAO-governed
  charity, proposal-based + allowlist), ecosystem → EcosystemVault (work rewards + operations).

## Treasury controls (re-certified from `treasuryModel`)
- **Discretionary disbursement (SEND-*):** `EcoTreasuryVault.sendVFIDE` is **DAO-only**, non-zero, balance-bounded.
- **Rescue cannot skim (RESCUE-*):** `rescueToken` is DAO-only and **cannot move the treasury's own VFIDE** (must
  use sendVFIDE) — no skim path.
- **Sub-splits sum to 100% (SUBSPLIT-*, PAYEE-*, SUB2-*):** FeeDistributor `dao+merchants+headhunters == 100%`
  with no channel over 80% (the default 50/30/20 is valid); RevenueSplitter payee shares sum to 10000 with no
  zero-shares; distribution sends the full balance (remainder to the last sink) — nothing is skimmable.
- **Timelocked + gated (TL-*, DIST-*):** split changes execute only after a 72h delay; distribution is gated by
  pause / min-interval / min-amount.
- **No user funds (DRAIN-*):** the treasury holds **ecosystem funds only**; no path reaches a user CardBoundVault.
- **Automated payouts capped (CAP-*):** auto-work payouts are bounded by `maxAutoWorkPayoutWei` (10,000, hard
  ceiling 1,000,000); EcosystemVault caps merchants per period.

## Findings
### TR-2 (LOW–MEDIUM) — `PolicySet` event misrepresents the active fee split
`ProofScoreBurnRouter` declares `baseBurnBps`/`baseSanctumBps`/`baseEcosystemBps` (150/5/20 = 1.5%/0.05%/0.2%) and
emits them in the `PolicySet` event, but the **active fee calc never uses them** — it applies the linear curve split
**40/10/50** (FIND-TR2). An off-chain consumer reading `PolicySet` would compute the wrong fee policy (≈85.7/2.9/11.4
instead of 40/10/50). This is a **transparency / dead-code issue** (Veritas-Law-adjacent: the emitted policy does
not reflect actual behavior), not a fund-safety bug. **Remediation:** remove the unused constants or emit the real
40/10/50 split + curve parameters. **Tracked open.**

### TR-1 (LOW) — Manual DAO disbursement has no vault-level cap/timelock
`sendVFIDE` / `withdrawNative` are DAO/owner-gated but carry **no per-disbursement timelock or cap at the vault
level** — drain-resistance relies on the DAO being a properly governed (timelocked) entity (FIND-TR1). The
**automated** paths (auto-work payouts, per-period merchant rewards) **are** capped; only the manual path lacks the
secondary safeguard. Standard for DAO-governed treasuries, but a vault-level disbursement cap or rate-limit would be
defense-in-depth. **Tracked open.**

## Certification status (ledger)
**Treasury: Exists = Yes · Certified (src+model) = Yes (174 scenarios) · Findings = TR-2 LOW-MED (PolicySet
mismatch), TR-1 LOW (no vault-level disbursement cap/timelock) · Findings-Fixed = No (open).** Open boundary:
on-chain stage-2 (bytecode) for ProofScoreBurnRouter/EcoTreasuryVault/RevenueSplitter/FeeDistributor + service e2e.
