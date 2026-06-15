# Subscription Commerce System — Capability Campaign (Campaign A)

**Priority: HIGH · Origin: OC-2/OC-3/OC-5 (the distinct allowance-pull channel).**

The dedicated, comprehensive audit of the subscription system — the second spending channel that intentionally
bypasses the vault's velocity limits and walletEpoch while remaining bounded by allowance + interval + amount. It
inherits the corrected recovery-severance behavior from Campaign C. Model: `lib/audit/subscriptionSystemModel.ts`;
matrix: `__tests__/audit/subscriptionSystem.test.ts` (**15 scenarios; all pass; typecheck 0; full audit suite
669/28 green**).

## Authority — subscriber-sovereign (certified sound)

| Action | Authorized | Note |
|---|---|---|
| create | subscriber (msg.sender) | sane bounds: amount > 0, interval ≥ 1h, distinct merchant |
| **modify(amount, interval)** | **subscriber ONLY** | **a merchant can NEVER raise the amount** (AUTH-01) |
| cancel | subscriber only | |
| pause | subscriber OR merchant | either party can suspend (disputes) |
| resume | subscriber only | and resume does **not** retroactively bill the paused period (AUTH-03) |
| processPayment | merchant (24h exclusive) → merchant/subscriber/DAO | trigger only — cannot change terms |
| emergencyCancel | DAO only | 48h delay + revoke (fraud/disputes) |

**Key property:** subscriptions are **subscriber-controlled standing authorizations, not merchant-guaranteed
revenue.** The subscriber can lower the amount or cancel at any time; the merchant cannot raise the amount or force
continuation (its recourse is pause + stopping the off-chain service). This extends VFIDE's owner-sovereign,
non-custodial philosophy to recurring commerce.

## Pull state machine (certified)
`processPayment` enforces, in order: active + not-paused; timing (`nextPayment`, interval); **fraud-ban** on either
party (PULL-03); the merchant-exclusive window then merchant/subscriber/DAO (PULL-01/02); grace-expiry auto-cancel
(PULL-08); **vault resolution + pinning** — recovery clears the subscriber's `vaultOf` so the pull reverts "no user
vault" (PULL-07, the Campaign C correction); allowance + balance, else a **grace period** with **failed-payment
counting that auto-cancels after 3 failures** (PULL-05) and an **N-H12 anti-spam guard** counting at most one
failure per block (PULL-06). Success path uses **CEI** (advance the clock before the external `transferFrom`), is
`nonReentrant`, and wraps `seer.reward` in try/catch so a malicious Seer cannot block or revert a payment. Batch
processing is bounded (200) with **try/catch-isolated** failures — one bad subscription cannot DoS the batch
(BATCH-01).

## Findings
**No critical/high findings — the subscription system is comprehensively sound.** Authority is correct (subscriber
sovereign, merchant cannot raise the amount), the pull is fully bounded and reentrancy-safe, failures self-heal via
grace + auto-cancel, fraud bans are enforced, and recovery + inheritance interactions are correct.

Architectural properties documented (deliberate, not defects — all consistent with owner sovereignty):
- **Aggregate allowance (BOUND-01):** all of a subscriber's subscriptions draw from ONE shared
  vault→SubscriptionManager allowance (`approveVFIDE`, admin-set + 7d timelock + guardian-cancel); there is no
  per-subscription allowance. The subscriber must size it for the sum of their subscriptions; it is the total
  exposure to the SubscriptionManager.
- **Two-channel bypass (OC-2):** the subscription channel does not consult the vault's per-tx/daily limits or
  walletEpoch — bounded instead by allowance + amount + interval + vault-pinning + grace/auto-cancel.
- **Subscriber-controlled terms:** merchants should understand subscriptions are not guaranteed revenue (the
  subscriber can modify/cancel); off-chain service provision is the merchant's lever.

## Registry impact
The Subscription Commerce System is certified at evidenced stages **1/6/10/11/12/13** (source traced, full
per-action authority + pull-state-machine edge matrix, adversarial, cross-system: subscription↔recovery↔
inheritance↔fraud, grandmother property: a recurring payment can only ever take the amount you set, on the schedule
you set, and you can stop it any time). **Stage 2 remains `~`.** No new critical/high findings; the channel is a
deliberately distinct, self-bounded, subscriber-sovereign surface — now comprehensively certified and documented.
