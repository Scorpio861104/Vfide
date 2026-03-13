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
npm run -s contract:analyze:strict

echo "[security-gate] All checks passed"
