#!/usr/bin/env bash
set -euo pipefail

# Enforce contract-analysis regressions while allowing pre-dispositioned detector families.
# Fails when blocker detector families appear or total findings exceed baseline.

MAX_FINDINGS="${SLITHER_MAX_FINDINGS:-1050}"
TMP_OUTPUT="$(mktemp)"
trap 'rm -f "$TMP_OUTPUT"' EXIT

set +e
npm run -s contract:analyze:strict >"$TMP_OUTPUT" 2>&1
STRICT_EXIT=$?
set -e

# Fast path: strict gate already passed.
if [[ "$STRICT_EXIT" -eq 0 ]]; then
  cat "$TMP_OUTPUT"
  exit 0
fi

cat "$TMP_OUTPUT"

BLOCKER_DETECTORS_REGEX='Detector: (reentrancy-no-eth|reentrancy-benign|reentrancy-events|missing-zero-check|uninitialized-local)'
if grep -Eq "$BLOCKER_DETECTORS_REGEX" "$TMP_OUTPUT"; then
  echo "[slither-regression-gate] FAIL: blocker detector family present in strict analysis output"
  exit "$STRICT_EXIT"
fi

FINDING_COUNT="$(grep -Eo '[0-9]+ result\(s\) found' "$TMP_OUTPUT" | tail -n 1 | awk '{print $1}')"
if [[ -z "$FINDING_COUNT" ]]; then
  echo "[slither-regression-gate] FAIL: unable to parse strict finding count"
  exit "$STRICT_EXIT"
fi

if (( FINDING_COUNT > MAX_FINDINGS )); then
  echo "[slither-regression-gate] FAIL: findings regression (${FINDING_COUNT} > ${MAX_FINDINGS})"
  exit "$STRICT_EXIT"
fi

echo "[slither-regression-gate] PASS: no blocker detector families and findings within baseline (${FINDING_COUNT}/${MAX_FINDINGS})"
echo "[slither-regression-gate] Note: strict slither exited non-zero on dispositioned detector families"
