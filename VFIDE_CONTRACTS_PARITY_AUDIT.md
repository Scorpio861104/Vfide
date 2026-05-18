# Frontend ↔ Contracts Parity Audit

**Date**: 2026-05-17 (R21–R23, with R23 correction)
**Method**: Walk every Solidity source in the production set, capture every `external`/`public` function, classify by access modifier (`onlyOwner`, `onlyDAO`, `onlyManager`, `onlyDev`, etc.), cross-reference against every frontend `functionName:` call.

---

## ⚠️ Correction (R23)

The previous version of this document claimed 5 user-facing functions were unwired:
- `Seer.requestScoreReview`
- `EcosystemVault.claimHeadhunterQuarterReward`
- `LiquidityIncentives.stake` / `unstake`
- `FeeDistributor.distribute`
- `RevenueSplitter.distribute`

**All 5 are actually wired.** The R22 audit script walked a smaller file set than the codebase contains (reported 350 unique `functionName` values; correct sweep produces 365), and the 15-function gap included the 5 above. Apologies for the noise.

| Function | Frontend wiring | UI surface |
|---|---|---|
| `Seer.requestScoreReview` | `hooks/useScoreDispute.ts::useRequestScoreReview` | `app/appeals/components/SubmitTab.tsx` (files on-chain dispute, mirrors to support ticket) |
| `EcosystemVault.claimHeadhunterQuarterReward` | `hooks/useHeadhunterHooks.ts` | `app/headhunter/components/ClaimsTab.tsx` (with revert→toast mapping for ECO_TooEarly / ECO_AlreadyExecuted / ECO_NotEligible / ECO_InsufficientFunds) |
| `LiquidityIncentives.stake` / `unstake` | `hooks/useStaking.ts` (9 exports: usePoolList, useAllPoolInfo, useUserStake, useUnstakeCooldown, useLpAllowance, useApproveLpToken, useStake, useUnstake) | `app/staking/page.tsx` (369 lines, full UI) |
| `FeeDistributor.distribute` | Inline `useWriteContract` | `app/treasury/components/RevenueTab.tsx:346` |
| `RevenueSplitter.distribute` | Inline `useWriteContract` | `app/splitter/page.tsx:164` |

---

## Real bug fixed (R22, kept): executeQueuedPayment

**Severity**: stuck-transaction bug with no user workaround.

When `executePayMerchant` is called with `amount >= largeTransferThreshold`, the contract auto-routes through `_queueWithdrawal` and the payment sits in a 7-day delay queue. The `GuardianPendingQueueWidget` displayed pending payments with a countdown that reached `(executable now)` — but only had a Cancel button. Above-threshold merchant payments could only be cancelled, never completed.

Fix: paired Execute button added to the widget. Shows when `remainingMs <= 0`. Calls `executeQueuedPayment` for payment items and `executeQueuedWithdrawal` for withdrawal items (the latter symmetry was also missing in this widget — withdrawals had an execute path in `useVaultOperations` but not where users actually saw queued items).

File changed: `components/security/GuardianPendingQueueWidget.tsx`.

---

## Genuinely unwired (documented stub features, NOT fixed)

These are full-feature stubs where the contract is deployed but the UI uses an off-chain `/api/` endpoint instead. Each requires its own multi-tab wiring effort with allowance/approve/execute flows:

| Feature | Contract | Stub | Estimated effort |
|---|---|---|---|
| **Payroll** | `PayrollManager.sol` (10 user-facing writes: createStream, withdraw, topUp, pauseStream, resumeStream, updatePayee, cancelPayeeUpdate, cancelStream, claimExpiredStream, claimExpiredStreamBatch) | `app/payroll/*` posts to `/api/streams` | Multi-day: ERC20 approve → createStream tx, 4 tabs (Dashboard / Streams / Create / History), event indexing for completed/active stream lists |
| **Flash loans** | `VFIDEFlashLoan.sol` (flashLoan, withdraw) | `app/flashloans/*` uses `/api/flashloans/lanes` | Smaller: borrow modal + receiver-contract education; flashLoan typically called by an integrator contract, so this is mostly about lender deposits |
| **Lending (term loans)** | `VFIDETermLoan.sol` (9 user-facing writes: createLoan, cancelLoan, signAsGuarantor, repay, payInstallment, claimDefault, etc.) | `app/lending/page.tsx` is intentionally `<ComingSoonPage />` | Major: peer-to-peer loan registry, co-signer state machine, offer browsing, default extraction UI |

---

## Things that look like gaps but aren't

After the R23 correction, the audit surfaces these as "high-confidence user-facing writes" but they're vestigial or admin-handoff patterns:

| Function | Why it's not a real gap |
|---|---|
| `CardBoundVault.queuePayment` / `queueWithdrawal` | External duplicates; the auto-queue path runs through `executePayMerchant` / `executeVaultToVaultTransfer` → internal `_queueWithdrawal` |
| `DevReserveVesting.beneficiaryVault` | Source comment: "kept for external backward compatibility only (e.g. existing monitoring scripts). Prefer `beneficiaryVaultAddress()`" |
| `SystemHandover.setAdmin` | `onlyDev` modifier — not user-callable |

---

## Honest summary of contracts↔frontend parity

After R23's correction:

- **Bugs**: 0 user-blocking contract integration bugs remain (R22 fixed the executeQueuedPayment stuck-transaction bug)
- **Missing user surfaces**: 0 — every contract with user-facing functions has UI wiring
- **Feature stubs**: 3 documented (Payroll, Flashloans, Lending) — these need feature work, not parity work
- **False positives in earlier audits**: 5 (R22) + 27 (R21 raw) — corrected here

The thing R22 said was a 5-item list to build was a 5-item list to verify. They were all already wired. The real remaining work is the 3 feature stubs above, each of which is days of work and explicit feature roadmap.


---

## R24 update: 3 stub features wired

Previously documented as stubs:
- ~~PayrollManager full feature~~ → wired in R24 (`hooks/usePayroll.ts` + 4 rewritten tabs)
- ~~VFIDEFlashLoan full feature~~ → wired in R24 (`hooks/useFlashLoan.ts` + rebuilt page)
- ~~VFIDETermLoan full feature~~ → wired in R24 (`hooks/useTermLoan.ts` + full lending UI replacing ComingSoonPage)

After R24:
- All previously-stubbed features now make real contract calls
- `flashLoan()` itself remains unwired by design — it requires an IERC3156FlashBorrower contract caller, not an EOA
- Payment plan flow (`proposePaymentPlan`/`acceptPaymentPlan`) is unwired — secondary restructuring path, can land later
- Everything needs testnet validation before mainnet
