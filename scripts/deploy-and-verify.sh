#!/usr/bin/env bash
set -euo pipefail
cd "${ROOT_DIR:-/workspaces/Vfide}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY is required" >&2
  exit 1
fi

export ZKSYNC_VERIFY=1
echo "[Deploy] Running combined deploy to zkSyncSepoliaTestnet..."
npx hardhat deploy-zksync --script deploy/deploy-all.js --network zkSyncSepoliaTestnet

echo "[Verify] Verifying all from registry..."
npx hardhat run --network zkSyncSepoliaTestnet scripts/verify-all.js

echo "Done. Registry file at deployments/zkSyncSepoliaTestnet.json"
