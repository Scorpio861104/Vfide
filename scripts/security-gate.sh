#!/usr/bin/env bash
set -euo pipefail

echo "[security-gate] Running focused security regression tests"
npx jest --runInBand \
  lib/__tests__/sessionKeyService.security.test.ts \
  lib/security/__tests__/accountProtection.test.ts \
  __tests__/api/security/logs.test.ts \
  __tests__/api/security/webhook-replay-metrics.test.ts \
  __tests__/api/security/violations.test.ts \
  __tests__/api/security/anomaly.test.ts \
  __tests__/api/security/csp-report.test.ts \
  __tests__/api/security/2fa-initiate.test.ts

echo "[security-gate] Running strict static smart-contract analysis"
bash scripts/slither-regression-gate.sh

echo "[security-gate] Compiling contracts for Seer watcher verifiers"
npm run -s contract:compile

echo "[security-gate] Running Seer watcher verifiers (challenge + strict runtime reason codes)"
npm run -s contract:verify:seer:watcher:local

echo "[security-gate] Running DevReserve on-chain verifier"
npm run -s contract:verify:devreserve:onchain:local

echo "[security-gate] All checks passed"
