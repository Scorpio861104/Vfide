#!/bin/bash
# Run jest in 6 sequential chunks, each with its own fresh node process,
# to avoid the cumulative heap exhaustion that OOMs the runner when
# ~478 suites are loaded into a single process.

set +e
cd /workspace/repo/Vfide

CHUNKS=(
  "__tests__/abi-parity.test.ts"
  "__tests__/api"
  "__tests__/components"
  "__tests__/app __tests__/lib __tests__/coverage"
  "__tests__/hooks hooks/__tests__"
  "__tests__/integration __tests__/security __tests__/payments __tests__/observability __tests__/performance __tests__/supply-chain __tests__/seer test __tests__/ux __tests__/wallet"
  "components app lib"
)

OUT=/tmp/jchunks.out
echo "=== JEST CHUNKED RUN START $(date) ===" > "$OUT"
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_PASSED_SUITES=0
TOTAL_FAILED_SUITES=0
for i in "${!CHUNKS[@]}"; do
  CHUNK="${CHUNKS[$i]}"
  echo "" >> "$OUT"
  echo "=== chunk $i: $CHUNK ===" >> "$OUT"
  NODE_OPTIONS="--max-old-space-size=2048" \
    timeout 230 \
    ./node_modules/.bin/jest $CHUNK --passWithNoTests --silent --maxWorkers=1 \
    >> "$OUT" 2>&1
  # Extract counts
  TAIL=$(tail -8 "$OUT")
  PASS=$(echo "$TAIL" | grep -oE "[0-9]+ passed" | head -1 | grep -oE "[0-9]+")
  FAIL=$(echo "$TAIL" | grep -oE "[0-9]+ failed" | head -1 | grep -oE "[0-9]+")
  PASS_S=$(echo "$TAIL" | grep "Test Suites:" | grep -oE "[0-9]+ passed" | head -1 | grep -oE "[0-9]+")
  FAIL_S=$(echo "$TAIL" | grep "Test Suites:" | grep -oE "[0-9]+ failed" | head -1 | grep -oE "[0-9]+")
  echo "[chunk $i SUMMARY] tests pass=${PASS:-0} fail=${FAIL:-0} suites pass=${PASS_S:-0} fail=${FAIL_S:-0}"
  TOTAL_PASS=$(( TOTAL_PASS + ${PASS:-0} ))
  TOTAL_FAIL=$(( TOTAL_FAIL + ${FAIL:-0} ))
  TOTAL_PASSED_SUITES=$(( TOTAL_PASSED_SUITES + ${PASS_S:-0} ))
  TOTAL_FAILED_SUITES=$(( TOTAL_FAILED_SUITES + ${FAIL_S:-0} ))
done

echo ""
echo "=========================================="
echo "AGGREGATE: tests $TOTAL_PASS passed / $TOTAL_FAIL failed"
echo "AGGREGATE: suites $TOTAL_PASSED_SUITES passed / $TOTAL_FAILED_SUITES failed"
echo "(Note: --testPathIgnorePatterns from jest.config.cjs apply to every chunk.)"
