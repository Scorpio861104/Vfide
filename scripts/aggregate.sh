#!/usr/bin/env bash
set -euo pipefail

OUT_DIR=reports/latest
mkdir -p "$OUT_DIR"

# Collect coverage artifacts
if [ -f coverage.json ]; then cp coverage.json "$OUT_DIR/coverage.json"; fi
for f in coverage-*.txt coverage-output.txt coverage-final-report.txt coverage-full-report.txt; do
  [ -f "$f" ] && cp "$f" "$OUT_DIR/" || true
done

# Collect fuzz/security outputs (existing filenames pattern)
for f in echidna-*.txt medusa-*.txt mythril-*.txt slither-report.txt foundry-fuzz-*.txt foundry-test-results.txt hardhat-test-results.txt gas-report.txt contracts-size.txt; do
  [ -f "$f" ] && cp "$f" "$OUT_DIR/" || true
done

# Surya graph & CI artifacts
[ -f surya-graph.png ] && cp surya-graph.png "$OUT_DIR/" || true
[ -f slither-report.txt ] && cp slither-report.txt "$OUT_DIR/" || true
[ -f mythril-VFIDEToken.txt ] && cp mythril-VFIDEToken.txt "$OUT_DIR/" || true

# Timestamp marker
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Aggregated at $TS" > "$OUT_DIR/INDEX.txt"

echo "Artifacts aggregated into $OUT_DIR";
