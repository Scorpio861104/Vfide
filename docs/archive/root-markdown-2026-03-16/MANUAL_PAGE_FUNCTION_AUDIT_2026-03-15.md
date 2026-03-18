]633;E;{   echo '# Manual Page Function Audit - 2026-03-15'\x3b   echo\x3b   echo '- Total route pages: '"$(wc -l < /tmp/audit_pages.txt)"\x3b   echo '- Pages with explicit page tests: '"$(wc -l < /tmp/audit_tested_pages.txt)"\x3b   echo '- Uncovered pages: '"$(wc -l < /tmp/audit_uncovered_pages.txt)"\x3b   echo\x3b   if [ -s /tmp/audit_uncovered_pages.txt ]\x3b then     echo '## Uncovered Pages'\x3b     cat /tmp/audit_uncovered_pages.txt\x3b     echo\x3b   fi\x3b   echo '## Page-by-Page Function Surface'\x3b   echo\x3b   while IFS= read -r page\x3b do     handlers=$(grep -nE '(^\\s*function\\s+|^\\s*const\\s+handle[A-Za-z0-9_]*\\s*=|=>\\s*\\{)' "$page" | wc -l)\x3b     writes=$(grep -nE 'useWriteContract|writeContract\\(|writeContractAsync\\(' "$page" | wc -l)\x3b     reads=$(grep -nE 'useReadContract|readContract\\(' "$page" | wc -l)\x3b     hooks=$(grep -nE 'use[A-Z][A-Za-z0-9_]+' "$page" | wc -l)\x3b     tests=$(awk -F'|' -v p="$page" '$1==p{print $2}' /tmp/audit_page_test_map.txt | paste -sd ', ' -)\x3b     [ -z "$tests" ] && tests='(none)'\x3b     echo '### '"$page"\x3b     echo '- Handler/function markers: '"$handlers"\x3b     echo '- Contract read markers: '"$reads"\x3b     echo '- Contract write markers: '"$writes"\x3b     echo '- Hook usage markers: '"$hooks"\x3b     echo '- Tests: '"$tests"\x3b     echo\x3b   done < /tmp/audit_pages.txt\x3b } > "$report";b9375844-c856-4cd8-b094-7bf79e78c1e1]633;C# Manual Page Function Audit - 2026-03-15

- Total route pages: 74
- Pages with explicit page tests: 75
- Uncovered pages: 0

## Page-by-Page Function Surface

### app/about/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/about-page.test.tsx

### app/achievements/page.tsx
- Handler/function markers: 2
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/achievements-page.test.tsx

### app/admin/page.tsx
- Handler/function markers: 58
- Contract read markers: 25
- Contract write markers: 18
- Hook usage markers: 71
- Tests: __tests__/app/admin-page.test.tsx

### app/appeals/page.tsx
- Handler/function markers: 10
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 21
- Tests: __tests__/app/appeals-page.test.tsx

### app/badges/page.tsx
- Handler/function markers: 4
- Contract read markers: 3
- Contract write markers: 3
- Hook usage markers: 12
- Tests: __tests__/app/badges-page.test.tsx

### app/benefits/page.tsx
- Handler/function markers: 6
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 4
- Tests: __tests__/app/benefits-page.test.tsx

### app/budgets/page.tsx
- Handler/function markers: 4
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 8
- Tests: __tests__/app/budgets-page.test.tsx

### app/buy/page.tsx
- Handler/function markers: 7
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 8
- Tests: __tests__/app/buy-page.test.tsx

### app/control-panel/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 4
- Tests: __tests__/app/control-panel-page.test.tsx

### app/council/page.tsx
- Handler/function markers: 9
- Contract read markers: 8
- Contract write markers: 5
- Hook usage markers: 13
- Tests: __tests__/app/council-page.test.tsx

### app/cross-chain/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/cross-chain-page.test.tsx

### app/crypto/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 3
- Tests: __tests__/app/crypto-page.test.tsx

### app/dao-hub/page.tsx
- Handler/function markers: 1
- Contract read markers: 3
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/dao-hub-page.test.tsx

### app/dashboard/page.tsx
- Handler/function markers: 15
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 20
- Tests: __tests__/app/dashboard-page.test.tsx

### app/demo/crypto-social/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 3
- Tests: __tests__/app/demo-crypto-social-page.test.tsx

### app/developer/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 3
- Tests: __tests__/app/developer-page.test.tsx

### app/docs/page.tsx
- Handler/function markers: 4
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 7
- Tests: __tests__/app/docs-page.test.tsx

### app/endorsements/page.tsx
- Handler/function markers: 1
- Contract read markers: 3
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/endorsements-page.test.tsx

### app/enterprise/page.tsx
- Handler/function markers: 6
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 11
- Tests: __tests__/app/enterprise-page.test.tsx

### app/escrow/page.tsx
- Handler/function markers: 8
- Contract read markers: 1
- Contract write markers: 1
- Hook usage markers: 8
- Tests: __tests__/app/escrow-page.test.tsx

### app/explorer/[id]/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 8
- Tests: __tests__/app/explorer-id-page.test.tsx

### app/explorer/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 4
- Tests: __tests__/app/explorer-page.test.tsx

### app/feed/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 2
- Tests: __tests__/app/feed-page.test.tsx

### app/flashlight/page.tsx
- Handler/function markers: 7
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 18
- Tests: __tests__/app/FlashloansPage.test.tsx,__tests__/app/flashlight-page.test.tsx

### app/governance/page.tsx
- Handler/function markers: 47
- Contract read markers: 7
- Contract write markers: 8
- Hook usage markers: 65
- Tests: __tests__/app/governance-page.test.tsx

### app/guardians/page.tsx
- Handler/function markers: 57
- Contract read markers: 13
- Contract write markers: 5
- Hook usage markers: 85
- Tests: __tests__/app/guardians-next-of-kin.test.tsx,__tests__/app/guardians-page.test.tsx

### app/hardware-wallet/page.tsx
- Handler/function markers: 7
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 16
- Tests: __tests__/app/hardware-wallet-page.test.tsx

### app/headhunter/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 14
- Tests: __tests__/app/headhunter-page.test.tsx

### app/insights/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/insights-page.test.tsx

### app/invite/[code]/page.tsx
- Handler/function markers: 4
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 14
- Tests: __tests__/app/invite-code-page.test.tsx

### app/invite/page.tsx
- Handler/function markers: 5
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/invite-page.test.tsx

### app/leaderboard/page.tsx
- Handler/function markers: 5
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 5
- Tests: __tests__/app/leaderboard-page.test.tsx

### app/legal/page.tsx
- Handler/function markers: 3
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 2
- Tests: __tests__/app/legal-page.test.tsx

### app/live-demo/page.tsx
- Handler/function markers: 2
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 4
- Tests: __tests__/app/live-demo-page.test.tsx

### app/merchant/page.tsx
- Handler/function markers: 3
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/merchant-page.test.tsx

### app/multisig/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 8
- Tests: __tests__/app/multisig-page.test.tsx

### app/notifications/page.tsx
- Handler/function markers: 3
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 7
- Tests: __tests__/app/notifications-page.test.tsx

### app/page.tsx
- Handler/function markers: 9
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 15
- Tests: __tests__/app/home-page.test.tsx

### app/paper-wallet/page.tsx
- Handler/function markers: 13
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 24
- Tests: __tests__/app/paper-wallet-page.test.tsx

### app/pay/page.tsx
- Handler/function markers: 9
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 19
- Tests: __tests__/app/pay-page.test.tsx

### app/payroll/page.tsx
- Handler/function markers: 8
- Contract read markers: 1
- Contract write markers: 1
- Hook usage markers: 13
- Tests: __tests__/app/payroll-page.test.tsx

### app/performance/page.tsx
- Handler/function markers: 5
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 13
- Tests: __tests__/app/performance-page.test.tsx

### app/pos/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/pos-page.test.tsx

### app/price-alerts/page.tsx
- Handler/function markers: 15
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 16
- Tests: __tests__/app/price-alerts-page.test.tsx

### app/profile/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 2
- Tests: __tests__/app/profile-page.test.tsx

### app/quests/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/quests-page.test.tsx

### app/reporting/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/reporting-page.test.tsx

### app/rewards/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/rewards-page.test.tsx

### app/sanctum/page.tsx
- Handler/function markers: 10
- Contract read markers: 4
- Contract write markers: 5
- Hook usage markers: 13
- Tests: __tests__/app/sanctum-page.test.tsx

### app/security-center/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 10
- Tests: __tests__/app/security-center-page.test.tsx

### app/seer-academy/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 2
- Tests: __tests__/app/seer-academy-page.test.tsx

### app/seer-service/page.tsx
- Handler/function markers: 14
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 37
- Tests: __tests__/app/seer-service-page.test.tsx

### app/setup/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 11
- Tests: __tests__/app/setup-page.test.tsx

### app/social-hub/page.tsx
- Handler/function markers: 14
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 14
- Tests: __tests__/app/social-hub-page.test.tsx,app/social-hub/__tests__/page.test.tsx

### app/social-messaging/page.tsx
- Handler/function markers: 6
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 14
- Tests: __tests__/app/social-messaging-page.test.tsx

### app/social-payments/page.tsx
- Handler/function markers: 1
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 4
- Tests: __tests__/app/social-payments-page.test.tsx

### app/social/page.tsx
- Handler/function markers: 2
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 3
- Tests: __tests__/app/social-page.test.tsx

### app/stealth/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/stealth-page.test.tsx

### app/stories/page.tsx
- Handler/function markers: 8
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 12
- Tests: __tests__/app/stories-page.test.tsx

### app/streaming/page.tsx
- Handler/function markers: 4
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 12
- Tests: __tests__/app/streaming-page.test.tsx

### app/subscriptions/page.tsx
- Handler/function markers: 3
- Contract read markers: 2
- Contract write markers: 5
- Hook usage markers: 10
- Tests: __tests__/app/subscriptions-page.test.tsx

### app/support/page.tsx
- Handler/function markers: 8
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 15
- Tests: __tests__/app/support-page.test.tsx

### app/taxes/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/taxes-page.test.tsx

### app/testnet/page.tsx
- Handler/function markers: 2
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 9
- Tests: __tests__/app/testnet-page.test.tsx

### app/theme-manager/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 5
- Tests: __tests__/app/theme-manager-page.test.tsx

### app/theme-showcase/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 2
- Tests: __tests__/app/theme-showcase-page.test.tsx

### app/theme/page.tsx
- Handler/function markers: 5
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 7
- Tests: __tests__/app/theme-page.test.tsx

### app/time-locks/page.tsx
- Handler/function markers: 3
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 6
- Tests: __tests__/app/time-locks-page.test.tsx

### app/token-launch/page.tsx
- Handler/function markers: 4
- Contract read markers: 6
- Contract write markers: 5
- Hook usage markers: 19
- Tests: __tests__/app/token-launch-page.test.tsx

### app/treasury/page.tsx
- Handler/function markers: 7
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 4
- Tests: __tests__/app/treasury-page.test.tsx

### app/vault/page.tsx
- Handler/function markers: 15
- Contract read markers: 5
- Contract write markers: 6
- Hook usage markers: 35
- Tests: __tests__/app/vault-page.test.tsx

### app/vault/recover/page.tsx
- Handler/function markers: 12
- Contract read markers: 7
- Contract write markers: 0
- Hook usage markers: 26
- Tests: __tests__/app/vault-recover-page.test.tsx

### app/vault/settings/page.tsx
- Handler/function markers: 0
- Contract read markers: 0
- Contract write markers: 0
- Hook usage markers: 0
- Tests: __tests__/app/vault-settings-page.test.tsx

### app/vesting/page.tsx
- Handler/function markers: 4
- Contract read markers: 5
- Contract write markers: 3
- Hook usage markers: 10
- Tests: __tests__/app/vesting-page.test.tsx

