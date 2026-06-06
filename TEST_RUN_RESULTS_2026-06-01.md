# Test Run Results

Generated: 2026-06-01

## Executive Summary
- Latest complete targeted run:
  - Command: `npx jest __tests__/app/merchant-refunds-route-page.test.tsx __tests__/app/inheritance-setup-page.test.tsx __tests__/app/me-page.test.tsx __tests__/app/merchant-gift-cards-route-page.test.tsx __tests__/app/merchants-route-page.test.tsx __tests__/app/vault-lock-page.test.tsx __tests__/app/merchant-analytics-route-page.test.tsx __tests__/app/token-launch-page.test.tsx --runInBand`
  - Result: `Test Suites: 8 passed, 8 total` and `Tests: 8 passed, 8 total`
- Earlier full `test:ci` run was partially executed and terminated in-session after reporting multiple failing route tests (those same 8 suites are included in the targeted run above and passed after fixes).
- Several `typecheck` runs were interrupted/terminated in-session logs; extraction includes all observed `Found X errors` lines.

## Notes
- This file contains both a concise summary and raw extracted evidence from session terminal artifacts.
- Raw blocks may include duplicated lines where the same command output was captured in multiple artifact files.

## Extracted Command/Result Lines

### call_7LI1nBw9IJLi43p1KQzacLY4__vscode-1780271772689

```text
594:Found 105 errors in 9 files.
```

### call_JVu30rTYXy326cDmLC6FPw4w__vscode-1780271772726

```text
8: PASS  __tests__/api/proxy-request-size-enforcement.test.ts
9: PASS  __tests__/app/governance-proposal-id-page.test.tsx
10: PASS  __tests__/app/seer-academy-page.test.tsx
11: PASS  __tests__/error-boundary.test.tsx
12: PASS  __tests__/price-utils.test.ts
13: PASS  __tests__/payroll-token-selection.test.tsx
14: PASS  __tests__/components/ParticleBackgroundTests.test.tsx
15: PASS  lib/__tests__/mobileDetection.test.ts
16: PASS  __tests__/app/legal-page.test.tsx
17: PASS  lib/security/__tests__/accountProtection.test.ts
18: PASS  __tests__/app/vault-pending-changes-page.test.tsx
19: PASS  __tests__/api/leaderboard/claim-prize.test.ts
39: PASS  lib/security/__tests__/webhookVerification.test.ts
40: PASS  __tests__/app/staking-route-page.test.tsx
41: PASS  __tests__/a11y/accessibility.test.tsx
42: FAIL  __tests__/app/merchant-refunds-route-page.test.tsx
78: PASS  __tests__/api/proxy-content-type-enforcement.test.ts
79: PASS  __tests__/lib/socialPayments.test.ts
80: PASS  __tests__/app/vault-recover-status-page.test.tsx
81: PASS  __tests__/components/ErrorBoundary.test.tsx
82: PASS  __tests__/security/siweChallenge.test.ts
83: PASS  __tests__/api/leaderboard/headhunter.test.ts
84: PASS  __tests__/contracts/UncoveredContractsSmoke.test.ts
85: PASS  __tests__/lib/gamification-storage.test.ts
86: PASS  __tests__/lib/cryptoValidation-gas.test.ts
87: FAIL  __tests__/app/inheritance-setup-page.test.tsx
119: PASS  __tests__/testnet.test.ts
120: PASS  __tests__/components/ui/progress.test.tsx
121: PASS  __tests__/app/remittance-route-page.test.tsx
122: PASS  __tests__/api/proxy-connect-src-restrictions.test.ts
123: PASS  __tests__/app/quests-page.test.tsx
124: PASS  __tests__/app/settings-route-page.test.tsx
125: PASS  __tests__/app/appeals-page.test.tsx
126: PASS  __tests__/app/splitter-route-page.test.tsx
127: PASS  __tests__/app/inheritance-page.test.tsx
128: PASS  __tests__/app/product-info-cart.test.tsx
129: FAIL  __tests__/app/me-page.test.tsx
165: PASS  lib/__tests__/requestContext.test.ts
166: PASS  __tests__/api/merchant-checkout-get.test.ts
167: PASS  __tests__/app/marketing-s-slug-route-page.test.tsx
168: PASS  __tests__/ui-components.test.tsx
169: FAIL  __tests__/app/merchant-gift-cards-route-page.test.tsx
205: PASS  __tests__/app/onboarding-page.test.tsx
206: PASS  __tests__/api/auth-challenge.test.ts
207: PASS  __tests__/app/inheritance-status-page.test.tsx
208: PASS  __tests__/app/inheritance-claim-page.test.tsx
209: PASS  __tests__/app/vault-safety-window-route-page.test.tsx
210: PASS  __tests__/app/marketplace-route-page.test.tsx
211: PASS  __tests__/components/ActivityFeed.test.tsx
212: PASS  __tests__/lib/env.test.ts
255: PASS  __tests__/app/merchant-staff-route-page.test.tsx
256: PASS  __tests__/api/proxy-nonce-propagation.test.ts
257: PASS  __tests__/app/merchant-profile-edit-route-page.test.tsx
258: PASS  __tests__/app/merchant-payouts-route-page.test.tsx
259: PASS  __tests__/api/proxy-csrf-enforcement.test.ts
260: PASS  __tests__/app/vault-safety-page.test.tsx
261: PASS  __tests__/app/social-messaging-page.test.tsx
262: PASS  __tests__/app/fraud-page.test.tsx
263: PASS  __tests__/app/store-slug-route-page.test.tsx
264: PASS  __tests__/app/sanctum-charity-id-route-page.test.tsx
265: PASS  __tests__/rls-enforcement.test.ts
266: PASS  __tests__/app/verifier-route-page.test.tsx
267: FAIL  __tests__/app/merchants-route-page.test.tsx
303: PASS  __tests__/app/merchant-expenses-route-page.test.tsx
304: PASS  __tests__/app/setup-page.test.tsx
305: PASS  __tests__/lib/merchantStaff.test.ts
306: PASS  __tests__/app/merchant-returns-route-page.test.tsx
307: PASS  __tests__/api/protocol-stats.test.ts
325: FAIL  __tests__/app/vault-lock-page.test.tsx
357: PASS  __tests__/app/merchant-subscriptions-page.test.tsx
358: PASS  __tests__/app/merchant-payment-links-page.test.tsx
359: PASS  __tests__/app/merchant-invoices-page.test.tsx
360: FAIL  __tests__/app/merchant-analytics-route-page.test.tsx
392: PASS  __tests__/app/merchant-inventory-page.test.tsx
393: PASS  __tests__/app/merchant-bookings-page.test.tsx
394: PASS  __tests__/app/profile-page.test.tsx
395: FAIL  __tests__/app/token-launch-page.test.tsx
781: PASS  __tests__/app/merchant-customers-route-page.test.tsx
782: PASS  __tests__/app/merchant-loyalty-route-page.test.tsx
783: PASS  __tests__/app/merchant-tax-page.test.tsx
784: PASS  __tests__/vfide-hooks.test.ts
785: PASS  __tests__/app/merchant-coupons-route-page.test.tsx
786: PASS  __tests__/app/merchant-installments-route-page.test.tsx
787: PASS  __tests__/app/merchant-suppliers-route-page.test.tsx
788: PASS  __tests__/app/public-route-metadata.test.ts
789: PASS  __tests__/websocket/auth-transport-hardening.test.ts
790: PASS  __tests__/components/payment-link-generator.test.tsx
791: PASS  __tests__/app/inheritance-override-page.test.tsx
792: PASS  __tests__/app/merchant-profile-setup-route-page.test.tsx
793: PASS  __tests__/api/proxy-cors-origin.test.ts
794: PASS  __tests__/app/proofscore-route-page.test.tsx
795: PASS  app/theme/__tests__/useTheme.test.ts
796: PASS  __tests__/app/stealth-page.test.tsx
797: PASS  __tests__/app/merchant-locations-route-page.test.tsx
798: PASS  __tests__/app/inheritance-memorial-page.test.tsx
799: PASS  __tests__/app/merchant-tips-route-page.test.tsx
800: PASS  __tests__/app/cross-chain-page.test.tsx
831: PASS  __tests__/lib/optimization/apiOptimization.test.ts
834:Terminated
```

### call_Keh3YS4RHj1j6UuZ6SGwhphY__vscode-1780271772768

```text
4:^C rg -n "^ FAIL|^ PASS|Test Suites:|Tests:|^\s*●|^Error:|^FAIL\s" /home/codespace/.vscode-remote/data/User/workspaceStorage/6f980d27/GitHub.copilot-chat/chat-session-resources/9832b1b0-61e7-4c15-94f7-7f844c17adb5/call_JVu30rTYXy326cDmLC6FPw4w__vscode-1780271772726/content.txt
6:@Scorpio861104 ➜ /workspaces/Vfide (main) $  rg -n "^ FAIL|^ PASS|Test Suites:|Tests:|^\s*●|^Error:|^FAIL\s" /home/codespace/.vscode-remote/data/User/workspaceStorage/6f980d27/GitHub.copilot-chat/chat-session-resources/9832b1b0-61e7-4c15-94f7-7f844c17adb5/call_JVu30rTYXy326cDmLC6FPw4w__vscode-1780271772726/content.txt
118: PASS  __tests__/app/merchant-refunds-route-page.test.tsx
119: PASS  __tests__/app/inheritance-setup-page.test.tsx
120: PASS  __tests__/app/me-page.test.tsx
121: PASS  __tests__/app/merchant-gift-cards-route-page.test.tsx
122: PASS  __tests__/app/merchants-route-page.test.tsx
123: PASS  __tests__/app/vault-lock-page.test.tsx
124: PASS  __tests__/app/merchant-analytics-route-page.test.tsx
125: PASS  __tests__/app/token-launch-page.test.tsx
127:Test Suites: 8 passed, 8 total
128:Tests:       8 passed, 8 total
```

### call_NbVkAdoMgqeeIg0SXFtJapUI__vscode-1780271772739

```text
3: PASS  __tests__/api/proxy-request-size-enforcement.test.ts
4: PASS  __tests__/app/governance-proposal-id-page.test.tsx
5: PASS  __tests__/app/seer-academy-page.test.tsx
6: PASS  __tests__/error-boundary.test.tsx
7: PASS  __tests__/price-utils.test.ts
8: PASS  __tests__/payroll-token-selection.test.tsx
9: PASS  __tests__/components/ParticleBackgroundTests.test.tsx
10: PASS  lib/__tests__/mobileDetection.test.ts
11: PASS  __tests__/app/legal-page.test.tsx
12: PASS  lib/security/__tests__/accountProtection.test.ts
13: PASS  __tests__/app/vault-pending-changes-page.test.tsx
14: PASS  __tests__/api/leaderboard/claim-prize.test.ts
34: PASS  lib/security/__tests__/webhookVerification.test.ts
35: PASS  __tests__/app/staking-route-page.test.tsx
36: PASS  __tests__/a11y/accessibility.test.tsx
37: FAIL  __tests__/app/merchant-refunds-route-page.test.tsx
73: PASS  __tests__/api/proxy-content-type-enforcement.test.ts
74: PASS  __tests__/lib/socialPayments.test.ts
75: PASS  __tests__/app/vault-recover-status-page.test.tsx
76: PASS  __tests__/components/ErrorBoundary.test.tsx
77: PASS  __tests__/security/siweChallenge.test.ts
78: PASS  __tests__/api/leaderboard/headhunter.test.ts
79: PASS  __tests__/contracts/UncoveredContractsSmoke.test.ts
80: PASS  __tests__/lib/gamification-storage.test.ts
81: PASS  __tests__/lib/cryptoValidation-gas.test.ts
82: FAIL  __tests__/app/inheritance-setup-page.test.tsx
114: PASS  __tests__/testnet.test.ts
115: PASS  __tests__/components/ui/progress.test.tsx
116: PASS  __tests__/app/remittance-route-page.test.tsx
117: PASS  __tests__/api/proxy-connect-src-restrictions.test.ts
118: PASS  __tests__/app/quests-page.test.tsx
119: PASS  __tests__/app/settings-route-page.test.tsx
120: PASS  __tests__/app/appeals-page.test.tsx
121: PASS  __tests__/app/splitter-route-page.test.tsx
122: PASS  __tests__/app/inheritance-page.test.tsx
123: PASS  __tests__/app/product-info-cart.test.tsx
124: FAIL  __tests__/app/me-page.test.tsx
160: PASS  lib/__tests__/requestContext.test.ts
161: PASS  __tests__/api/merchant-checkout-get.test.ts
162: PASS  __tests__/app/marketing-s-slug-route-page.test.tsx
163: PASS  __tests__/ui-components.test.tsx
164: FAIL  __tests__/app/merchant-gift-cards-route-page.test.tsx
200: PASS  __tests__/app/onboarding-page.test.tsx
201: PASS  __tests__/api/auth-challenge.test.ts
202: PASS  __tests__/app/inheritance-status-page.test.tsx
203: PASS  __tests__/app/inheritance-claim-page.test.tsx
204: PASS  __tests__/app/vault-safety-window-route-page.test.tsx
205: PASS  __tests__/app/marketplace-route-page.test.tsx
206: PASS  __tests__/components/ActivityFeed.test.tsx
207: PASS  __tests__/lib/env.test.ts
250: PASS  __tests__/app/merchant-staff-route-page.test.tsx
251: PASS  __tests__/api/proxy-nonce-propagation.test.ts
252: PASS  __tests__/app/merchant-profile-edit-route-page.test.tsx
253: PASS  __tests__/app/merchant-payouts-route-page.test.tsx
254: PASS  __tests__/api/proxy-csrf-enforcement.test.ts
255: PASS  __tests__/app/vault-safety-page.test.tsx
256: PASS  __tests__/app/social-messaging-page.test.tsx
257: PASS  __tests__/app/fraud-page.test.tsx
258: PASS  __tests__/app/store-slug-route-page.test.tsx
259: PASS  __tests__/app/sanctum-charity-id-route-page.test.tsx
260: PASS  __tests__/rls-enforcement.test.ts
261: PASS  __tests__/app/verifier-route-page.test.tsx
262: FAIL  __tests__/app/merchants-route-page.test.tsx
298: PASS  __tests__/app/merchant-expenses-route-page.test.tsx
299: PASS  __tests__/app/setup-page.test.tsx
300: PASS  __tests__/lib/merchantStaff.test.ts
301: PASS  __tests__/app/merchant-returns-route-page.test.tsx
302: PASS  __tests__/api/protocol-stats.test.ts
320: FAIL  __tests__/app/vault-lock-page.test.tsx
352: PASS  __tests__/app/merchant-subscriptions-page.test.tsx
353: PASS  __tests__/app/merchant-payment-links-page.test.tsx
354: PASS  __tests__/app/merchant-invoices-page.test.tsx
355: FAIL  __tests__/app/merchant-analytics-route-page.test.tsx
387: PASS  __tests__/app/merchant-inventory-page.test.tsx
388: PASS  __tests__/app/merchant-bookings-page.test.tsx
389: PASS  __tests__/app/profile-page.test.tsx
390: FAIL  __tests__/app/token-launch-page.test.tsx
776: PASS  __tests__/app/merchant-customers-route-page.test.tsx
777: PASS  __tests__/app/merchant-loyalty-route-page.test.tsx
778: PASS  __tests__/app/merchant-tax-page.test.tsx
779: PASS  __tests__/vfide-hooks.test.ts
780: PASS  __tests__/app/merchant-coupons-route-page.test.tsx
781: PASS  __tests__/app/merchant-installments-route-page.test.tsx
782: PASS  __tests__/app/merchant-suppliers-route-page.test.tsx
783: PASS  __tests__/app/public-route-metadata.test.ts
784: PASS  __tests__/websocket/auth-transport-hardening.test.ts
785: PASS  __tests__/components/payment-link-generator.test.tsx
786: PASS  __tests__/app/inheritance-override-page.test.tsx
787: PASS  __tests__/app/merchant-profile-setup-route-page.test.tsx
788: PASS  __tests__/api/proxy-cors-origin.test.ts
789: PASS  __tests__/app/proofscore-route-page.test.tsx
790: PASS  app/theme/__tests__/useTheme.test.ts
791: PASS  __tests__/app/stealth-page.test.tsx
792: PASS  __tests__/app/merchant-locations-route-page.test.tsx
793: PASS  __tests__/app/inheritance-memorial-page.test.tsx
794: PASS  __tests__/app/merchant-tips-route-page.test.tsx
795: PASS  __tests__/app/cross-chain-page.test.tsx
826: PASS  __tests__/lib/optimization/apiOptimization.test.ts
829:Terminated
```

### call_lqzxtpmP99nEHBGkXuVkzA2E__vscode-1780271772722

```text
92: PASS  __tests__/security/deployment-sets.test.ts
93: PASS  __tests__/lib/features-scaffold.test.ts
94:Terminated
630:Found 105 errors in 9 files.
905:Found 44 errors in 8 files.
```

### call_zgQCJ9E5rORaXiSNuLtOzwas__vscode-1780271772719

```text
92: PASS  __tests__/security/deployment-sets.test.ts
93: PASS  __tests__/lib/features-scaffold.test.ts
94:Terminated
630:Found 105 errors in 9 files.
905:Found 44 errors in 8 files.
```

