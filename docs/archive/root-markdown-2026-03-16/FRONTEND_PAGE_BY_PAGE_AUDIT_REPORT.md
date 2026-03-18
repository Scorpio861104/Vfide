# Frontend Page-by-Page Function Audit

Generated: 2026-03-15

## Summary
- Total route pages audited: 74
- Pages with explicit route tests: 74
- Pages missing route tests: 0
- Handler-heavy pages reviewed manually: app/admin/page.tsx, app/guardians/page.tsx, app/governance/page.tsx, app/escrow/page.tsx, app/vault/page.tsx, app/appeals/page.tsx, app/payroll/page.tsx, app/social-hub/page.tsx, app/token-launch/page.tsx, app/invite/[code]/page.tsx

## Page-by-Page Matrix
| Page | Route Test | Handler Count | useReadContract | useWriteContract | Notable Contract Calls |
|---|---:|---:|---:|---:|---|
| app/about/page.tsx | PASS | 0 | 0 | 0 | - |
| app/achievements/page.tsx | PASS | 0 | 0 | 0 | - |
| app/admin/page.tsx | PASS | 16 | 24 | 1 | owner, vaultOnly, policyLocked, circuitBreaker, totalSupply, presaleMinted ... |
| app/appeals/page.tsx | PASS | 4 | 0 | 0 | - |
| app/badges/page.tsx | PASS | 1 | 2 | 1 | balanceOf, getScore, mintBadge |
| app/benefits/page.tsx | PASS | 0 | 0 | 0 | - |
| app/budgets/page.tsx | PASS | 0 | 0 | 0 | - |
| app/buy/page.tsx | PASS | 0 | 0 | 0 | - |
| app/control-panel/page.tsx | PASS | 0 | 0 | 0 | - |
| app/council/page.tsx | PASS | 0 | 7 | 1 | getCouncilMembers, getCandidates, getElectionStatus, isCandidate, isCouncilMember, getClaimable ... |
| app/cross-chain/page.tsx | PASS | 0 | 0 | 0 | - |
| app/crypto/page.tsx | PASS | 0 | 0 | 0 | - |
| app/dao-hub/page.tsx | PASS | 0 | 2 | 0 | - |
| app/dashboard/page.tsx | PASS | 0 | 0 | 0 | - |
| app/demo/crypto-social/page.tsx | PASS | 0 | 0 | 0 | - |
| app/developer/page.tsx | PASS | 0 | 0 | 0 | - |
| app/docs/page.tsx | PASS | 0 | 0 | 0 | - |
| app/endorsements/page.tsx | PASS | 0 | 2 | 0 | getActiveEndorsements, getEndorsementStats |
| app/enterprise/page.tsx | PASS | 1 | 0 | 0 | - |
| app/escrow/page.tsx | PASS | 5 | 0 | 0 | - |
| app/explorer/[id]/page.tsx | PASS | 0 | 0 | 0 | - |
| app/explorer/page.tsx | PASS | 1 | 0 | 0 | - |
| app/feed/page.tsx | PASS | 0 | 0 | 0 | - |
| app/flashlight/page.tsx | PASS | 0 | 0 | 0 | - |
| app/governance/page.tsx | PASS | 9 | 5 | 3 | getActiveProposals, getVotingPower, getVoterStats, isEligible, vote, finalize ... |
| app/guardians/page.tsx | PASS | 19 | 12 | 2 | owner, isGuardian, isGuardianMature, getRecoveryStatus, approveRecovery, nextOfKin ... |
| app/hardware-wallet/page.tsx | PASS | 4 | 0 | 0 | - |
| app/headhunter/page.tsx | PASS | 0 | 0 | 0 | - |
| app/insights/page.tsx | PASS | 0 | 0 | 0 | - |
| app/invite/[code]/page.tsx | PASS | 1 | 0 | 0 | - |
| app/invite/page.tsx | PASS | 1 | 0 | 0 | - |
| app/leaderboard/page.tsx | PASS | 0 | 0 | 0 | - |
| app/legal/page.tsx | PASS | 0 | 0 | 0 | - |
| app/live-demo/page.tsx | PASS | 1 | 0 | 0 | - |
| app/merchant/page.tsx | PASS | 0 | 0 | 0 | - |
| app/multisig/page.tsx | PASS | 0 | 0 | 0 | - |
| app/notifications/page.tsx | PASS | 1 | 0 | 0 | - |
| app/page.tsx | PASS | 0 | 0 | 0 | - |
| app/paper-wallet/page.tsx | PASS | 0 | 0 | 0 | - |
| app/pay/page.tsx | PASS | 1 | 0 | 0 | - |
| app/payroll/page.tsx | PASS | 5 | 0 | 0 | - |
| app/performance/page.tsx | PASS | 1 | 0 | 0 | - |
| app/pos/page.tsx | PASS | 0 | 0 | 0 | - |
| app/price-alerts/page.tsx | PASS | 3 | 0 | 0 | - |
| app/profile/page.tsx | PASS | 0 | 0 | 0 | - |
| app/quests/page.tsx | PASS | 0 | 0 | 0 | - |
| app/reporting/page.tsx | PASS | 0 | 0 | 0 | - |
| app/rewards/page.tsx | PASS | 0 | 0 | 0 | - |
| app/sanctum/page.tsx | PASS | 0 | 3 | 1 | getBalance, getCharityCount, _nextProposalId, deposit, approveDisbursement, executeDisbursement |
| app/security-center/page.tsx | PASS | 0 | 0 | 0 | - |
| app/seer-academy/page.tsx | PASS | 0 | 0 | 0 | - |
| app/seer-service/page.tsx | PASS | 0 | 0 | 0 | - |
| app/setup/page.tsx | PASS | 0 | 0 | 0 | - |
| app/social-hub/page.tsx | PASS | 5 | 0 | 0 | - |
| app/social-messaging/page.tsx | PASS | 2 | 0 | 0 | - |
| app/social-payments/page.tsx | PASS | 0 | 0 | 0 | - |
| app/social/page.tsx | PASS | 0 | 0 | 0 | - |
| app/stealth/page.tsx | PASS | 0 | 0 | 0 | - |
| app/stories/page.tsx | PASS | 3 | 0 | 0 | - |
| app/streaming/page.tsx | PASS | 0 | 0 | 0 | - |
| app/subscriptions/page.tsx | PASS | 3 | 1 | 1 | getUserSubscriptions, pauseSubscription, resumeSubscription, cancelSubscription |
| app/support/page.tsx | PASS | 2 | 0 | 0 | - |
| app/taxes/page.tsx | PASS | 0 | 0 | 0 | - |
| app/testnet/page.tsx | PASS | 0 | 0 | 0 | - |
| app/theme-manager/page.tsx | PASS | 0 | 0 | 0 | - |
| app/theme-showcase/page.tsx | PASS | 0 | 0 | 0 | - |
| app/theme/page.tsx | PASS | 3 | 0 | 0 | - |
| app/time-locks/page.tsx | PASS | 0 | 0 | 0 | - |
| app/token-launch/page.tsx | PASS | 3 | 5 | 2 | getTierRemaining, getUserInfo, allowance, approve, buyTokens, buyWithStable |
| app/treasury/page.tsx | PASS | 0 | 0 | 0 | - |
| app/vault/page.tsx | PASS | 5 | 4 | 1 | balanceOf, allowance, nextNonce, walletEpoch, approve, deposit ... |
| app/vault/recover/page.tsx | PASS | 2 | 0 | 0 | - |
| app/vault/settings/page.tsx | PASS | 0 | 0 | 0 | - |
| app/vesting/page.tsx | PASS | 1 | 4 | 1 | getVestingStatus, getVestingSchedule, claimsPaused, beneficiary, claim |

## Findings
- Fixed earlier: /api/health now returns payload consistent with degraded status (ok=false, status=degraded when env checks fail).
- Fixed earlier: /api/proposals now degrades gracefully on DB auth failures (Postgres 28P01).
- Runtime smoke on representative high-handler routes returned HTTP 200 for pages and expected degraded semantics for /api/health and /api/proposals in this local environment.

## Runtime Smoke (Port 3101)
- /admin 200
- /guardians 200
- /governance 200
- /escrow 200
- /vault 200
- /invite/abc123 200
- /theme 200
- /theme-manager 200
- /theme-showcase 200
- /api/health 503 with {"ok":false,"status":"degraded",...}
- /api/proposals 200 with {"proposals":[],"total":0,"limit":50,"offset":0,"degraded":true}