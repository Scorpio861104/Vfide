# Merchant Disputes — Capability Certification (Backend Completion Campaign 4)

**Wave B · first campaign.** Full certification of VFIDE's commerce escrow + dispute/refund lifecycle
(`CommerceEscrow.sol`). Model: `lib/audit/merchantDisputesModel.ts`; matrix:
`__tests__/audit/merchantDisputes.test.ts` (**156 scenarios; all pass; typecheck 0; full audit suite 1197/33
green**). Target (150+) met.

## Lifecycle (verified from source)
State machine: **NONE → OPEN → FUNDED → RELEASED / REFUNDED / DISPUTED → RESOLVED.**
- **open / openAndFundWithIntent** — buyer creates (optionally funds) an escrow against an ACTIVE merchant.
- **markFunded** — pulls buyer funds into escrow; re-checks merchant SUSPENDED/DELISTED at funding time (F-SC-024);
  verifies the buyer vault still belongs to the buyer (defense in depth); stamps `fundedAt`.
- **release** *(buyer or DAO)* — FUNDED → RELEASED; re-checks merchant SUSPENDED/DELISTED at release time (no
  payout to a restricted merchant — buyer is routed to dispute/refund); resolves the seller vault live (N-H15).
- **refund** *(merchant or DAO)* — FUNDED/DISPUTED → REFUNDED; counts toward merchant auto-suspension.
- **dispute** *(buyer or merchant)* — FUNDED → DISPUTED. Score-tiered **buyer** lock (3d trusted / 7d neutral /
  14d low-trust) using the **live** score; the merchant may dispute anytime. Low-value disputes
  (< `minDisputeAmountForPenalty`) don't count against the merchant (N-H14).
- **resolve** *(DAO only)* — DISPUTED → RESOLVED; `buyerWins` → buyer paid, else merchant paid. High-value escrows
  (≥ 10,000 VFIDE) require **ARBITER_TIMELOCK (7d)** from dispute before the DAO may resolve (Issue #269 — an
  evidence window).
- **settleByInheritance** *(permissionless)* — FUNDED/DISPUTED and a party's vault in MEMORIAL/CLOSED → refunds the
  buyer (the safer side; merchant hasn't fulfilled); does not count as a merchant refund (R-4).
- **cancelStaleOpen** *(permissionless)* — OPEN past `OPEN_ESCROW_EXPIRY` (7d) → cancelled.

Two layers, non-custodial-consistent: the **on-chain escrow controls the funds**; the off-chain `disputes` API is a
**dispute record** (opener/respondent/evidence) that cannot move funds.

## Certified-sound properties
- **Buyer cannot self-refund (GAME-01, INV-twolayer):** the only buyer-favorable terminal that moves funds is a DAO
  `resolve(buyerWins)` or `settleByInheritance` (a party died) — never a buyer-triggered refund. The DAO arbitrates.
- **Anti dispute-spam (GAME-02/03, LOCK-*):** a buyer cannot fund-then-instantly-dispute to freeze a merchant; the
  score-tiered lock forces a wait (low-trust buyers wait longest, 14d), and it reads the **live** score so a
  last-minute trust pump cannot shorten it.
- **Suspended merchants are never paid (GAME-04, STATUS-*):** SUSPENDED/DELISTED merchants are blocked at *both*
  fund-time and release-time (F-SC-024); an auto-suspended merchant cannot collect via a pre-existing OPEN escrow.
  A refund still works (funds return to the buyer, not the merchant).
- **No orphaned funds (GAME-06):** mid-flight vault rotation cannot orphan escrowed funds — payout vaults resolve
  live at payout time (N-H15).
- **No frozen funds on death (INH-*, R-4):** a party's death cannot lock funds — anyone can `settleByInheritance`
  to refund the buyer; inheritance is not counted as a service-quality signal.
- **No griefing the merchant's reputation (GAME-05, N-H14):** sub-`minDisputeAmountForPenalty` disputes do not
  touch the merchant's auto-suspension counter.
- **High-value evidence window (GAME-08, HV-*):** a high-value dispute cannot be rushed to resolution inside the
  7-day arbiter timelock.
- **Clean state machine (MATRIX-*, INV-no-double-spend):** the full 7×7 action×state matrix holds; terminal states
  (RELEASED/REFUNDED/RESOLVED) accept no further fund-moving action.

## Findings
### MD-1 (MEDIUM) — No automatic release-on-timeout
There is **no time-based auto-release to the merchant**: the merchant is paid only by buyer `release` or DAO
`resolve`. A buyer who funds then goes silent (never releases, never disputes) leaves funds in FUNDED indefinitely.
The merchant **does** have recourse — they may `dispute` at any time (no lock applies to merchants) and the DAO
resolves merchant-wins (FIND-MD1-recourse) — but that routes **every** non-confirming sale through DAO arbitration
rather than an automatic release after a confirmation window. Funds are safe (the escrow is buyer-protective by
design, appropriate for the financially-excluded audience); the cost is DAO arbitration load and delayed merchant
payment at scale. **Remediation:** an optional auto-release after a configurable confirmation window, haltable by a
buyer dispute. Completeness/throughput, not a fund-safety bug. **Tracked open.**

### MD-2 (LOW) — Escrow resolution is fully DAO-centralized
`resolve` is `onlyDAO`; every escrow dispute routes to the DAO as sole arbiter (high-value gets the 7d evidence
window). The `FraudJury` exists in the protocol but is **not** in the escrow-resolution path. For a protocol
targeting scale this is an arbitration-throughput / decentralization consideration. **Observation/design — tracked.**

## Certification status (ledger)
**Merchant Disputes: Exists = Yes · Certified (src+model) = Yes (156 scenarios) · Findings = MD-1 MED (no
auto-release), MD-2 LOW (DAO-only resolution) · Findings-Fixed = No (open; MD-1 optional auto-release, MD-2 design).**
Open boundary: on-chain stage-2 (bytecode) for CommerceEscrow + service e2e for the off-chain disputes record.
