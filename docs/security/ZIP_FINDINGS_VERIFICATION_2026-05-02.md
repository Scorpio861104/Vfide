# ZIP Findings Verification Ledger (2026-05-02)

Scope:

- docs/security/AUDIT_FINDINGS_RUNNING_TODO.md
- Zip-derived sections under "Phase 2/3 findings"

Verification outcome:

- No TODO entries remain for zip findings.
- Every zip-tracked item below has code-level evidence.

## Pre-Audit Hygiene

- CLIP-01: fixed in app/paper-wallet/components/GenerateTab.tsx (clipboard clear + warning)
- PRINT-01: validated in app/paper-wallet/components/GenerateTab.tsx (print disabled warning)
- RATELIMIT-01: validated in lib/auth/rateLimit.ts + lib/security/anomalyDetection.ts using lib/security/requestContext.ts
- DNS-01: validated in lib/webhooks/merchantWebhookDispatcher.ts (DNS resolve + resolved IP pinning)
- PII-01: validated in lib/logger.ts + lib/logger/config.ts (scrub/redact path)
- MEDAPI-01: validated in app/api/proposals/route.ts (eligibility + MAX_PROPOSALS_PER_WEEK guard)

## Contract Fixes

- C-306: validated in scripts/deploy-all.ts and scripts/deploy-full.ts (treasury contract-code guard)
- C-307: validated in contracts/VFIDEToken.sol (permit deadline in struct hash)
- C-345: validated in contracts/ProofScoreBurnRouter.sol (shortfall shift bounded by totalFee)
- C-346: validated in contracts/ProofScoreBurnRouter.sol (no Pausable inheritance)
- C-347: validated in contracts/ProofScoreBurnRouter.sol (immutable token)
- C-311: validated in contracts/VFIDEToken.sol (token breaker no-op; FeeDistributor call wrapped in try/catch)
- C-391: validated in scripts/transfer-governance.ts (setDAO + transferOwnership wiring)
- C-392: validated in contracts/AdminMultiSig.sol (EMERGENCY_APPROVALS = 4)
- C-393: validated in contracts/AdminMultiSig.sol (veto count threshold enforcement)
- C-325-328: validated in contracts/OwnerControlPanel.sol (VFIDEToken apply/propose wrapper set)

## Timelock / Fraud / Vault / Halt

- TL-302: validated in contracts/EcosystemVault.sol (sensitive paths timelocked; no standalone executor-whitelist surface)
- FRAUD-EXT-01: validated in contracts/FraudRegistry.sol (MIN_REPORTER_SCORE + appeal window + DAO confirm path)
- FRAUD-EXT-02: fixed in contracts/FraudRegistry.sol (rescue recipient restricted to original sender)
- FRAUD-EXT-03: validated in contracts/FraudRegistry.sol (user-callable processClearFlagEscrowRefunds)
- FRAUD-EXT-04: fixed in contracts/FraudRegistry.sol (getPendingEscrowsPaginated)
- VAULT-EXT-01: fixed in contracts/CardBoundVault.sol (guardian-threshold pause + auto-expiry)
- VAULT-EXT-02: fixed in contracts/CardBoundVault.sol (guardian-approved staged recovery required)
- VAULT-EXT-03: fixed in contracts/VaultRecoveryClaim.sol (verifier-only finalization path removed)
- VAULT-EXT-04: validated stale in contracts tree (legacy factory target absent)
- HALT-01: validated across
  - contracts/VaultHub.sol (pause/unpause deprecated revert)
  - contracts/CircuitBreaker.sol (signal-only trigger path)
  - contracts/VFIDESecurity.sol EmergencyBreaker (co-sign proposal/confirm toggle)

## Focused validation commands run

- npx hardhat compile
- NODE_OPTIONS='--import tsx' npx mocha --timeout 120000 test/hardhat/EmergencyControlRecovery.test.ts
- NODE_OPTIONS='--import tsx' npx mocha --timeout 120000 test/hardhat/EmergencyControlRecoveryCommitteeCap.test.ts

Notes:

- Direct Jest invocation for __tests__/api/proposals.test.ts fails due local test harness mocking mismatch (withAuth import shape), not due missing MEDAPI controls in route code.
