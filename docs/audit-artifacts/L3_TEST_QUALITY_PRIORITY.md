# L-3 Test Quality Priority Backlog

Generated: 2026-04-12 18:24:07Z

## Summary

- Total skip/todo markers: 164

## Category Counts

| Priority Bucket | Count |
|---|---:|
| P0-security-auth | 151 |
| P2-general | 13 |

## Top 40 Ranked Entries (Security-First)

| Priority | File:Line | Marker |
|---:|---|---|
| P0 | __tests__/contracts/security/security-contracts.test.ts:103 | it.todo('should update council member via proposal'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:105 | it.todo('should prevent direct council updates'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:107 | it.todo('should prevent duplicate members'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:113 | it.todo('should pause contract globally'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:115 | it.todo('should unpause contract'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:117 | it.todo('should set pause expiry for auto-unpause'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:119 | it.todo('should require reason for pause'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:121 | it.todo('should only allow EMERGENCY_PAUSER_ROLE'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:125 | it.todo('should pause specific function by selector'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:127 | it.todo('should unpause specific function'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:129 | it.todo('should batch pause multiple functions'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:131 | it.todo('should prevent duplicate pause'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:135 | it.todo('should auto-unpause after expiry'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:137 | it.todo('should not unpause indefinite pause'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:143 | it.todo('should update circuit breaker config'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:145 | it.todo('should check circuit breaker conditions'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:147 | it.todo('should trigger on volume threshold'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:149 | it.todo('should trigger on price drop'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:157 | it.todo('should prevent reentrancy on single function'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:165 | it.todo('should prevent cross-contract reentrancy'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:173 | it.todo('should protect vault deposits'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:175 | it.todo('should protect vault withdrawals'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:177 | it.todo('should protect token transfers'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:183 | it.todo('should create withdrawal request'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:185 | it.todo('should apply 7-day delay for large amounts'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:187 | it.todo('should skip delay for small amounts'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:189 | it.todo('should prevent zero amount withdrawal'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:191 | it.todo('should prevent withdrawal exceeding balance'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:195 | it.todo('should execute after delay'); |
| P0 | __tests__/contracts/security/security-contracts.test.ts:197 | it.todo('should prevent early execution'); |

## Next Recommended Sprint Slice

1. Convert the first 10 P0 entries above from todo to executable tests.
2. Add one integration scenario per domain: pause controls, circuit breaker, reentrancy, withdrawal delay.
3. Re-run focused lane: __tests__/contracts/security/security-contracts.test.ts.
