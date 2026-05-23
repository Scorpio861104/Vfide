#!/bin/bash
# Run jest in many sequential micro-chunks for chunk 3 (app tests),
# each with its own fresh node process.

set +e
cd /workspace/repo/Vfide

OUT=/tmp/chunk3-micro.out
echo "=== CHUNK 3 MICRO RUN START $(date) ===" > "$OUT"
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_PASSED_SUITES=0
TOTAL_FAILED_SUITES=0
FAILED_SUITES=()

# Sub-chunk app tests by 15 each (89/15 ≈ 6 chunks)
APP_FILES=( $(ls __tests__/app/*.test.tsx) )
TOTAL_FILES=${#APP_FILES[@]}
PER_CHUNK=8

for (( start=0; start<TOTAL_FILES; start+=PER_CHUNK )); do
  end=$((start + PER_CHUNK))
  (( end > TOTAL_FILES )) && end=$TOTAL_FILES
  CHUNK_FILES="${APP_FILES[@]:start:PER_CHUNK}"
  CHUNK_NAME="app-$start-$end"
  echo "" >> "$OUT"
  echo "=== chunk $CHUNK_NAME ===" >> "$OUT"
  NODE_OPTIONS="--max-old-space-size=2048" \
    timeout 230 \
    ./node_modules/.bin/jest $CHUNK_FILES --passWithNoTests --silent --maxWorkers=1 \
    >> "$OUT" 2>&1
  TESTS_LINE=$(tail -20 "$OUT" | grep "^Tests:" | tail -1)
  SUITES_LINE=$(tail -20 "$OUT" | grep "^Test Suites:" | tail -1)
  PASS=$(echo "$TESTS_LINE" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
  FAIL=$(echo "$TESTS_LINE" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+")
  PASS_S=$(echo "$SUITES_LINE" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
  FAIL_S=$(echo "$SUITES_LINE" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+")
  echo "[$CHUNK_NAME SUMMARY] tests pass=${PASS:-0} fail=${FAIL:-0} suites pass=${PASS_S:-0} fail=${FAIL_S:-0}"
  TOTAL_PASS=$(( TOTAL_PASS + ${PASS:-0} ))
  TOTAL_FAIL=$(( TOTAL_FAIL + ${FAIL:-0} ))
  TOTAL_PASSED_SUITES=$(( TOTAL_PASSED_SUITES + ${PASS_S:-0} ))
  TOTAL_FAILED_SUITES=$(( TOTAL_FAILED_SUITES + ${FAIL_S:-0} ))
done

# Lib + coverage in one chunk
echo "" >> "$OUT"
echo "=== chunk lib+coverage ===" >> "$OUT"
NODE_OPTIONS="--max-old-space-size=2048" \
  timeout 230 \
  ./node_modules/.bin/jest __tests__/lib __tests__/coverage --passWithNoTests --silent --maxWorkers=1 \
  >> "$OUT" 2>&1
TESTS_LINE=$(tail -20 "$OUT" | grep "^Tests:" | tail -1)
SUITES_LINE=$(tail -20 "$OUT" | grep "^Test Suites:" | tail -1)
PASS=$(echo "$TESTS_LINE" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
FAIL=$(echo "$TESTS_LINE" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+")
PASS_S=$(echo "$SUITES_LINE" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
FAIL_S=$(echo "$SUITES_LINE" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+")
echo "[lib+coverage SUMMARY] tests pass=${PASS:-0} fail=${FAIL:-0} suites pass=${PASS_S:-0} fail=${FAIL_S:-0}"
TOTAL_PASS=$(( TOTAL_PASS + ${PASS:-0} ))
TOTAL_FAIL=$(( TOTAL_FAIL + ${FAIL:-0} ))
TOTAL_PASSED_SUITES=$(( TOTAL_PASSED_SUITES + ${PASS_S:-0} ))
TOTAL_FAILED_SUITES=$(( TOTAL_FAILED_SUITES + ${FAIL_S:-0} ))

echo ""
echo "=========================================="
echo "AGGREGATE: tests $TOTAL_PASS passed / $TOTAL_FAIL failed"
echo "AGGREGATE: suites $TOTAL_PASSED_SUITES passed / $TOTAL_FAILED_SUITES failed"
