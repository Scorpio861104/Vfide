#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=${ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}
cd "$ROOT_DIR"

echo "[trip] Node/npm versions:" && node -v && npm -v || true

echo "[trip] Installing dependencies (npm ci)" && npm ci --no-audit --no-fund

echo "[trip] Hardhat compile (EVM)" && npx hardhat compile

echo "[trip] Hardhat tests (EVM)" && npx hardhat test

echo "[trip] EVM coverage (solidity-coverage)" && npm run coverage

echo "[trip] zkLocal checks"
if curl -sSf http://127.0.0.1:8011 >/dev/null 2>&1; then
  echo " - era-test-node detected on 127.0.0.1:8011; running zkLocal compile/tests"
  npm run compile:zk:local
  npm run test:zk:local
else
  echo " - era-test-node not detected; skip zkLocal tests (start Docker to enable)"
fi

echo "[trip] Foundry fuzz (short)"
FOUNDRY_PROFILE=fuzz forge test --match-contract VFIDETokenFuzz --fuzz-runs 500 || echo " - Foundry fuzz skipped/failed"

echo "[trip] Differential capture (EVM)"
npm run diff:evm || echo " - diff:evm failed"

if [[ -n "${PRIVATE_KEY:-}" ]]; then
  echo "[trip] Differential capture (zk)"
  npm run diff:zk || echo " - diff:zk failed"
  echo "[trip] Differential compare"
  npm run diff:compare || echo " - diff:compare reported differences"
else
  echo "[trip] PRIVATE_KEY not set; skipping zk diff and compare"
fi

echo "[trip] Gas report"
GAS_REPORT=1 GAS_REPORT_OUTPUT=gas-report.txt npm test --silent || echo " - gas report via tests skipped"

echo "[trip] Contract sizes"
npm run size || echo " - size check skipped"

echo "[trip] Lint & format check"
npm run lint:sol || echo " - solhint warnings present"
npm run format || true

echo "[trip] Surya graph"
npm run surya:graph || echo " - surya graph skipped (graphviz may be missing)"

echo "[trip] Slither analysis (soft)"
npm run slither || echo " - slither not installed or findings present"

echo "[trip] Docgen (soft)"
npm run docgen || echo " - docgen skipped"

echo "[trip] Done ✅"
