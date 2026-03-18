# API Endpoint Verification Matrix (2026-03-16)

- Total route handlers: 71
- Direct endpoint test mapping: 71/71
- Mapping method: normalized route-to-test matching (supports dynamic segments and hyphenated test names).
- API suite run target: __tests__/api (PASS: 72 suites, 676 tests).

| Endpoint | Route File | Test Mapping | Test File |
|---|---|---:|---|
| /api/activities | app/api/activities/route.ts | YES | __tests__/api/activities.test.ts |
| /api/analytics | app/api/analytics/route.ts | YES | __tests__/api/analytics.test.ts |
| /api/attachments/[id] | app/api/attachments/[id]/route.ts | YES | __tests__/api/attachments/id.test.ts |
| /api/attachments/upload | app/api/attachments/upload/route.ts | YES | __tests__/api/attachments/upload.test.ts |
| /api/auth | app/api/auth/route.ts | YES | __tests__/api/auth.test.ts |
| /api/auth/challenge | app/api/auth/challenge/route.ts | YES | __tests__/api/auth-challenge.test.ts |
| /api/auth/logout | app/api/auth/logout/route.ts | YES | __tests__/api/auth/logout.test.ts |
| /api/auth/revoke | app/api/auth/revoke/route.ts | YES | __tests__/api/auth/revoke.test.ts |
| /api/badges | app/api/badges/route.ts | YES | __tests__/api/badges.test.ts |
| /api/crypto/balance/[address] | app/api/crypto/balance/[address]/route.ts | YES | __tests__/api/crypto/balance.test.ts |
| /api/crypto/fees | app/api/crypto/fees/route.ts | YES | __tests__/api/crypto/fees.test.ts |
| /api/crypto/payment-requests | app/api/crypto/payment-requests/route.ts | YES | __tests__/api/crypto/payment-requests.test.ts |
| /api/crypto/payment-requests/[id] | app/api/crypto/payment-requests/[id]/route.ts | YES | __tests__/api/crypto/payment-requests/id.test.ts |
| /api/crypto/price | app/api/crypto/price/route.ts | YES | __tests__/api/crypto/price.test.ts |
| /api/crypto/rewards/[userId] | app/api/crypto/rewards/[userId]/route.ts | YES | __tests__/api/crypto/rewards.test.ts |
| /api/crypto/rewards/[userId]/claim | app/api/crypto/rewards/[userId]/claim/route.ts | YES | __tests__/api/crypto/rewards.test.ts |
| /api/crypto/transactions/[userId] | app/api/crypto/transactions/[userId]/route.ts | YES | __tests__/api/crypto/transactions.test.ts |
| /api/csrf | app/api/csrf/route.ts | YES | __tests__/api/csrf.test.ts |
| /api/endorsements | app/api/endorsements/route.ts | YES | __tests__/api/endorsements.test.ts |
| /api/errors | app/api/errors/route.ts | YES | __tests__/api/errors.test.ts |
| /api/flashloans/lanes | app/api/flashloans/lanes/route.ts | YES | __tests__/api/flashloans-lanes.test.ts |
| /api/flashloans/lanes/[id] | app/api/flashloans/lanes/[id]/route.ts | YES | __tests__/api/flashloans-lanes.test.ts |
| /api/flashloans/lanes/[id]/actions | app/api/flashloans/lanes/[id]/actions/route.ts | YES | __tests__/api/flashloans-lanes.test.ts |
| /api/friends | app/api/friends/route.ts | YES | __tests__/api/friends.test.ts |
| /api/gamification | app/api/gamification/route.ts | YES | __tests__/api/gamification.test.ts |
| /api/groups | app/api/groups/route.ts | YES | __tests__/api/groups/invites.test.ts |
| /api/groups/invites | app/api/groups/invites/route.ts | YES | __tests__/api/groups/invites.test.ts |
| /api/groups/join | app/api/groups/join/route.ts | YES | __tests__/api/groups/join.test.ts |
| /api/groups/members | app/api/groups/members/route.ts | YES | __tests__/api/groups/members.test.ts |
| /api/groups/messages | app/api/groups/messages/route.ts | YES | __tests__/api/groups/messages.test.ts |
| /api/health | app/api/health/route.ts | YES | __tests__/api/health.test.ts |
| /api/leaderboard/claim-prize | app/api/leaderboard/claim-prize/route.ts | YES | __tests__/api/leaderboard/claim-prize.test.ts |
| /api/leaderboard/headhunter | app/api/leaderboard/headhunter/route.ts | YES | __tests__/api/leaderboard/headhunter.test.ts |
| /api/leaderboard/monthly | app/api/leaderboard/monthly/route.ts | YES | __tests__/api/leaderboard/monthly.test.ts |
| /api/messages | app/api/messages/route.ts | YES | __tests__/api/messages.test.ts |
| /api/messages/delete | app/api/messages/delete/route.ts | YES | __tests__/api/messages/delete.test.ts |
| /api/messages/edit | app/api/messages/edit/route.ts | YES | __tests__/api/messages/edit.test.ts |
| /api/messages/reaction | app/api/messages/reaction/route.ts | YES | __tests__/api/messages/reaction.test.ts |
| /api/notifications | app/api/notifications/route.ts | YES | __tests__/api/notifications.test.ts |
| /api/notifications/preferences | app/api/notifications/preferences/route.ts | YES | __tests__/api/notifications/preferences.test.ts |
| /api/notifications/push | app/api/notifications/push/route.ts | YES | __tests__/api/notifications/push.test.ts |
| /api/notifications/vapid | app/api/notifications/vapid/route.ts | YES | __tests__/api/notifications/vapid.test.ts |
| /api/performance/metrics | app/api/performance/metrics/route.ts | YES | __tests__/api/performance/metrics.test.ts |
| /api/proposals | app/api/proposals/route.ts | YES | __tests__/api/proposals.test.ts |
| /api/quests/achievements | app/api/quests/achievements/route.ts | YES | __tests__/api/quests/achievements.test.ts |
| /api/quests/achievements/claim | app/api/quests/achievements/claim/route.ts | YES | __tests__/api/quests/achievements/claim.test.ts |
| /api/quests/claim | app/api/quests/claim/route.ts | YES | __tests__/api/quests/claim.test.ts |
| /api/quests/daily | app/api/quests/daily/route.ts | YES | __tests__/api/quests/daily.test.ts |
| /api/quests/notifications | app/api/quests/notifications/route.ts | YES | __tests__/api/quests/notifications.test.ts |
| /api/quests/onboarding | app/api/quests/onboarding/route.ts | YES | __tests__/api/quests/onboarding.test.ts |
| /api/quests/streak | app/api/quests/streak/route.ts | YES | __tests__/api/quests/streak.test.ts |
| /api/quests/weekly | app/api/quests/weekly/route.ts | YES | __tests__/api/quests/weekly.test.ts |
| /api/quests/weekly/claim | app/api/quests/weekly/claim/route.ts | YES | __tests__/api/quests/weekly/claim.test.ts |
| /api/security/2fa/initiate | app/api/security/2fa/initiate/route.ts | YES | __tests__/api/security/2fa-initiate.test.ts |
| /api/security/anomaly | app/api/security/anomaly/route.ts | YES | __tests__/api/security/anomaly.test.ts |
| /api/security/csp-report | app/api/security/csp-report/route.ts | YES | __tests__/api/security/csp-report.test.ts |
| /api/security/guardian-attestations | app/api/security/guardian-attestations/route.ts | YES | __tests__/api/security/guardian-attestations.test.ts |
| /api/security/keys | app/api/security/keys/route.ts | YES | __tests__/api/security-keys.test.ts |
| /api/security/logs | app/api/security/logs/route.ts | YES | __tests__/api/security/logs.test.ts |
| /api/security/next-of-kin-fraud-events | app/api/security/next-of-kin-fraud-events/route.ts | YES | __tests__/api/security/next-of-kin-fraud-events.test.ts |
| /api/security/qr-signature-events | app/api/security/qr-signature-events/route.ts | YES | __tests__/api/security/qr-signature-events.test.ts |
| /api/security/recovery-fraud-events | app/api/security/recovery-fraud-events/route.ts | YES | __tests__/api/security/recovery-fraud-events.test.ts |
| /api/security/violations | app/api/security/violations/route.ts | YES | __tests__/api/security/violations.test.ts |
| /api/security/webhook-consumer-example | app/api/security/webhook-consumer-example/route.ts | YES | __tests__/api/security/webhook-consumer-example.test.ts |
| /api/security/webhook-replay-metrics | app/api/security/webhook-replay-metrics/route.ts | YES | __tests__/api/security/webhook-replay-metrics.test.ts |
| /api/seer/analytics | app/api/seer/analytics/route.ts | YES | __tests__/api/seer/analytics.test.ts |
| /api/seer/analytics/rollup | app/api/seer/analytics/rollup/route.ts | YES | __tests__/api/seer/analytics.test.ts |
| /api/sync | app/api/sync/route.ts | YES | __tests__/api/sync.test.ts |
| /api/transactions/export | app/api/transactions/export/route.ts | YES | __tests__/api/transactions/export.test.ts |
| /api/users | app/api/users/route.ts | YES | __tests__/api/users.test.ts |
| /api/users/[address] | app/api/users/[address]/route.ts | YES | __tests__/api/users/address.test.ts |