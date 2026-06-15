# Treasury Cluster — Certification (⚠️ Certified With Known Boundary)
## EcoTreasuryVault.sol · RevenueSplitter.sol · FeeDistributor.sol

## Scope & method
Gate-audit of the three treasury contracts (`EcoTreasuryVault` 339L, `RevenueSplitter` 193L, `FeeDistributor`
451L). Method matches the on-chain campaign: **source-level audit + an executable TS fund-movement model** run as
an adversarial matrix (no solc here — a compiled run is the confirming step). The repo's
`EcoTreasuryVaultNotifierTimelock` / `EcoTreasuryVaultModuleExpiry` / `RevenueSplitter` /
`FeeDistributorGuardrails` hardhat suites are the on-chain evidence for a compiler-equipped environment.

- Model: `lib/audit/treasuryModel.ts`
- Matrix: `__tests__/audit/treasuryModel.test.ts` — **20 scenarios, all pass**; project typecheck 0.

## Central question (different from the governance audits)
The governance contracts were non-custodial by ABSENCE of fund code. These three **HOLD funds** — but
**ecosystem/protocol funds, NOT user-vault funds**. So the question is drain-resistance: can anyone drain the
treasury, are disbursements bounded and authorized, and is the revenue split unmanipulable?

**Verdict: no arbitrary-drain primitive; every outflow is bounded + authorized; splits must sum to 100%; changes
are timelocked; and no path touches user-vault funds.** ⚠️ (not 🟢) only because the verdict rests on source +
model rather than a compiled run.

## What the audit verified (from source)

**EcoTreasuryVault — two outflows, both DAO-gated + nonReentrant.**
- `sendVFIDE(to, amount, reason)` is the only discretionary disbursement: `onlyDAO` (routes through the certified
  DAO → DAOTimelock), non-zero, balance-bounded. There is no public withdraw/drain.
- `rescueToken(token, to, amount)` is `onlyDAO` and **explicitly excludes the treasury's own VFIDE**
  (`require(token != vfideToken, "use sendVFIDE")`) — so the rescue path cannot be used to skim the treasury.
  Rescue is strictly for *other* accidentally-sent tokens.
- Module/notifier wiring is DAO-gated with a propose/apply + expiry pattern.

**FeeDistributor — routes the ecosystem share to 3 pools; split must sum to 100%, bounded per sink, timelocked.**
- `distribute()` (nonReentrant, whenNotPaused, rate-limited by `MIN_DISTRIBUTION_INTERVAL`, min-amount-gated)
  sends ONLY to `daoPayrollPool` / `merchantPool` / `headhunterPool` by the split bps; the headhunter share is the
  rounding remainder, so the **full balance is always accounted** — nothing is skimmable. Failed transfers emit
  events but don't brick (F-76 reconciliation handles direct transfers).
- `proposeSplitChange` **reverts unless `dao + merchants + headhunters == MAX_BPS`** (exactly 100%) AND no single
  channel exceeds `MAX_SINGLE_BPS` — an admin cannot misroute funds. Split, destination, and rescue changes all
  use propose → execute after a **72h delay** (`SPLIT_CHANGE_DELAY`); rescue is likewise 72h-timelocked.

**RevenueSplitter — generic routing tool; payee shares sum to 100%, no zero-shares, full-balance routing.**
- `distribute(token)` (nonReentrant) routes the full balance to the configured payees; the **last payee gets the
  remainder** (H-29), so nothing is left behind or skimmed. Uses a low-level call with bool-decode for
  non-standard ERC-20s (M-2, e.g. USDT).
- Payee shares **must sum to exactly 10000 (100%)** with **no zero-shares** (`RS_ZeroShare`), enforced on both the
  initial set and `updatePayees` (which uses an update → apply pattern).

**Custody boundary.** All three hold **ecosystem/protocol funds, not user-vault funds**. No path reaches a user's
CardBoundVault; even the DAO's discretionary `sendVFIDE` moves treasury funds, not user custody.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/EcoTreasuryVaultNotifierTimelock.test.ts`, `test/hardhat/EcoTreasuryVaultModuleExpiry.test.ts` —
  module/notifier timelock + expiry.
- `test/hardhat/RevenueSplitter.test.ts` — payee validation + distribution.
- `test/hardhat/FeeDistributorGuardrails.test.ts` — split bounds, timelocked changes, distribution accounting.
- Wire into the verification harness/manifest alongside the other on-chain suites.

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via the four hardhat suites above.
- The DAO's `sendVFIDE` is discretionary (the DAO can disburse ecosystem funds to any recipient) — this is
  intended treasury behavior, and it is gated by the certified DAO → timelock path, but it is a real power over
  ECOSYSTEM funds (not user funds). Operators/community should monitor disbursements via the emitted events/ledger.
- No new findings.

## Bottom line
The Treasury cluster has **no arbitrary-drain primitive**: every outflow either routes to pre-validated
payees/pools by shares that must sum to 100% (full balance accounted, nothing skimmable), or is a DAO-gated
discretionary disbursement, or is a rescue of non-treasury tokens — and split/destination/rescue changes are all
72h-timelocked. These hold ecosystem funds, not user funds; no path reaches a user vault.
