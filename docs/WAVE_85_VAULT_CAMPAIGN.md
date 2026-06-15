# Wave 85 — Institution Completion Campaign: Ownership / Vault

The first institution of the **Preparedness** stack, and structurally different from the commerce six:
the Vault is where "your funds live in your own non-custodial vault" is actually enforced. So this audit
has a dimension the commerce campaigns didn't — verifying the **non-custodial invariant** holds by
*absence of code* (no path can let anyone but the owner move the owner's funds). It found **two real
defects** and fixed both. Verified: typecheck 0, nav 0 broken, **116 tests / 12 suites** (+7), no regression.

## Findings & defects
### Defect 1 — Invisible intelligence: VaultHealthScore rendered nowhere (Stage 3 visibility)
`VaultHealthScore` is a complete component computing a 4-dimension vault safety score — Security, Recovery,
Trust, Setup (each 0–25, total /100, graded Excellent→At Risk) — from real on-chain reads (guardianCount,
maxPerTransfer/dailyTransferLimit, paused) plus the owner's ProofScore, with concrete per-dimension
recommendations. It was rendered on **zero pages**. The vault owner computed a full safety assessment they
could never see — the same invisible-intelligence pattern the commerce campaigns kept surfacing
(Discovery, Merchant Trust, Merchant Health, Seer). **Fix:** wired into the vault page via `VaultContent`,
between the guardian-setup banner and quick actions, fed real `vaultAddress` + `proofScore`.

### Defect 2 — Untested inline scoring (Stage 5 verification)
Unlike every commerce institution (each has a tested `lib/seer/*.ts` engine), the vault-health scoring
logic lived **inline in the `.tsx` component** with zero test coverage — so the safety math couldn't be
verified independently and had no regression guard. **Fix:** extracted the pure scoring into a tested
`lib/vault/vaultHealth.ts` engine (`computeVaultHealth`), added NaN/Infinity hardening (`safeCount` floors
garbage to 0 so a bad read can never poison the score), and refactored the component to consume it. 7 new
engine tests cover the dimension math, grade thresholds, recommendations, NaN hardening, saturation
ceiling, ProofScore bands, and the recovery property (more protection always raises the score).

## The 8 stages
| Stage | Result | Evidence |
|---|---|---|
| 1. Architecture | ✅ | CardBoundVault faceted design (withdrawal queue, inheritance, intent validator); non-custodial by construction |
| 2. Wiring | ✅ | vault hooks read the right contracts; ABI parity clean |
| 3. Visibility | ✅ **(fixed)** | **VaultHealthScore** now rendered on the vault page (was invisible) |
| 4. Explainability | ✅ | vault surfaces explain the non-custodial guarantee + recovery in plain language |
| 5. Runtime | ✅ **(fixed + 7 tests)** | scoring extracted to a **tested engine**; EIP-712 + ABI parity verified |
| 6. Grandmother test | ✅ | "your guardians still have to approve, and you have a veto window to cancel — that alone can't take your vault" |
| 7. Edge cases | ✅ | NaN/Infinity hardened; dimension caps proven; recovery property tested |
| 8. Civilization audit | ⏳ | deferred — runs after the full preparedness stack is individually complete |

## The non-custodial invariant — verified, not assumed (the defining property)
- **No custody-violating functions** anywhere in the CardBoundVault facets: no `freeze`, `blacklist`,
  `seize`, `confiscate`, `forceWithdraw`, `forceTransfer`, `adminWithdraw`, `drain`, `sweep`, `lockFunds`.
- **Admin cannot move funds.** The admin facet manages configuration (spend limits, thresholds) only. Its
  single `safeTransfer` is `applyRescueERC20` — a foreign-token rescue that **explicitly reverts on VFIDE**
  (`CBV_CannotRescueVFIDE`), with defense-in-depth guards at both propose- and apply-time. The vault's
  actual asset can never leave via rescue; only stray non-VFIDE tokens can be returned to the owner.
- **Withdrawals are owner-gated.** `executeQueuedWithdrawal` requires `msg.sender == admin` (the card
  owner), with a code-hash check on the receiver (anti-tamper), a daily limit, and a receiver-guardian cap.
- **Guardians can only CANCEL, never redirect.** `cancelQueuedWithdrawal` is callable by admin OR any
  guardian — the critical anti-theft protection: if keys are stolen and a thief queues a large withdrawal,
  a guardian cancels it during the delay window. Guardians cannot send funds anywhere.
- **Admin reassignment is safe.** Only via the owner's two-step `transferAdmin`, or
  `executeRecoveryRotation` — which requires the hub, a guardian-threshold-approved staged rotation, AND a
  timelock. No single party, and no protocol admin, can seize a vault.

## ABI + EIP-712 parity — verified
- Every function the vault hooks read maps to a real contract function or public getter. (The `isVault`
  apparent-miss was a false positive — it's correctly read from **VaultHub**, where it exists.)
- The frontend EIP-712 domain (`name: 'CardBoundVault'`, `version: '1'`) matches the contract constants,
  and the `TransferIntent` struct matches the contract typehash **field-for-field in order** (vault,
  toVault, amount, nonce, walletEpoch, deadline, chainId). The historically-reported chain-ID binding bug
  is already fixed: the signature binds `chainId: vaultHub.expectedChainId` (the vault's deployment chain),
  with a pre-flight chain switch.

## New tests
7 vault-health engine tests: dimension math, full-protection = 100/Excellent, no-protection = low/At Risk,
saturation ceiling (caps respected), recovery property (adding a guardian always improves the score),
NaN/Infinity hardening, grade thresholds, and ProofScore→Trust bands.

## Remaining caveats (honest)
- **The contract-audit gate is the real boundary.** "Complete" here = the off-chain-verifiable layer:
  non-custodial invariant by code inspection, ABI/EIP-712 parity, tested off-chain scoring, visible health.
  The CardBoundVault's own correctness (the inheritance state machine, the withdrawal-queue accounting, the
  recovery rotation) rests on a professional audit + deployment (W73). More of this institution's weight
  sits behind the on-chain wall than any commerce institution — that is stated plainly, not hidden.
- The main vault page has strong inline non-custodial messaging but no `PlainHelp` block (commerce pages
  have one). Flagged as a minor explainability inconsistency, not forced — the inline copy already covers it.
- The "Civilization" stage is intentionally deferred: a Preparedness Civilization Audit (Vault → Recovery →
  Guardians → Continuity → Successors → Emergency Operators) only makes sense once those institutions are
  each individually complete (the user's planned Waves 86–90).

## Completion decision
**Ownership / Vault earns ✅ COMPLETE (off-chain) / 🔒 contract audit gate** — it survived an adversarial
audit that found two real defects (invisible safety score, untested scoring), both fixed and verified, and
the defining non-custodial invariant was proven to hold by code inspection rather than assumed. The honest
limit is the contract-audit gate, stated explicitly.

## Next
Per the planned sequence: **Wave 86 — Recovery Institution Campaign**, then Guardians (87), Continuity
(88), Successors & Emergency Operators (89), and finally the **Preparedness Civilization Audit** (90).
