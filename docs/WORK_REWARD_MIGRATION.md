# Work Reward Migration (Burn-Fee Funded, Howey-Safer)

This project now keeps competition and referral tracking, while replacing rank/percentage payouts with fixed compensation for verified work.

## What changed

- **Disabled payout paths remain disabled:**
  - `claimMerchantReward(...)`
  - `claimHeadhunterReward(...)`
- **New payout paths (manager-only):**
  - `payMerchantWorkReward(worker, amount, reason)`
  - `payReferralWorkReward(worker, amount, reason)`

- **Automatic payout configuration (owner):**
  - `configureAutoWorkPayout(enabled, merchantTxReward, merchantReferralReward, userReferralReward)`

## Burn-fee split behavior

`ProofScoreBurnRouter` still routes ecosystem fees to `EcosystemVault`.
`EcosystemVault.allocateIncoming()` then allocates unallocated balance into:

- `councilPool`
- `merchantPool`
- `headhunterPool`
- `operationsPool`

Work payouts are now drawn from `merchantPool` and `headhunterPool` only.

## Automatic payout behavior

When `autoWorkPayoutEnabled = true`, the vault attempts fixed payouts automatically on verified events:

- `recordMerchantTransaction(...)` → tries merchant fixed payout from `merchantPool`
- `creditMerchantReferral(...)` → tries referral fixed payout from `headhunterPool`
- `creditUserReferral(...)` → tries referral fixed payout from `headhunterPool`

If a pool has insufficient balance, automatic payout is skipped (no revert), and managers can pay later with manual payout functions.

## Integration checklist

1. Keep competition/referral scoring and leaderboards as engagement UX.
2. Stop calling any rank/percentage claim function for rewards.
3. Use manager workflows to call:
   - `payMerchantWorkReward(...)` for verified merchant work
   - `payReferralWorkReward(...)` for verified acquisition/referral work
4. Include a clear `reason` string for auditability.
5. Keep reward messaging as fixed compensation for completed work, not passive return.

## Frontend hooks

`hooks/useHeadhunterHooks.ts` now includes:

- `usePayMerchantWorkReward()`
- `usePayReferralWorkReward()`

`useClaimHeadhunterReward()` intentionally throws to prevent accidental use of disabled rank-based payouts.
