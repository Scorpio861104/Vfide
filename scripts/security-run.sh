#!/usr/bin/env bash
set -euo pipefail

mkdir -p reports/latest

echo "[Slither] Static analysis";
if command -v slither >/dev/null 2>&1; then
  slither . --print human-summary > slither-report.txt || true
  cp slither-report.txt reports/latest/ || true
else
  echo "Slither not installed. Install with: pip install slither-analyzer";
fi

echo "[Mythril] Symbolic analysis (VFIDEToken)";
if command -v myth >/dev/null 2>&1; then
  myth analyze contracts/VFIDEToken.sol -o text > mythril-VFIDEToken.txt || true
  cp mythril-VFIDEToken.txt reports/latest/ || true
else
  echo "Mythril not installed. Install with: pip install mythril";
fi

echo "[Surya] Graph";
if command -v surya >/dev/null 2>&1; then
  surya graph contracts-min/*.sol | dot -Tpng > surya-graph.png || true
  cp surya-graph.png reports/latest/ || true
else
  echo "Surya not installed (npm install -D surya graphviz needed).";
fi

echo "Security runs complete.";