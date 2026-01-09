#!/usr/bin/env bash
set -euo pipefail
cd "${ROOT_DIR:-/workspaces/Vfide}"

# Ensure rust env if present
source "$HOME/.cargo/env" 2>/dev/null || true

echo "== Versions =="
{ echo -n "Node: "; node -v; } || true
{ echo -n "npm: "; npm -v; } || true
{ echo -n "Hardhat: "; npx --no-install hardhat --version || npx hardhat --version || true; } || true
{ echo -n "zksolc: "; zksolc --version; } || echo "zksolc missing"
{ echo -n "zkvyper: "; zkvyper --version; } || echo "zkvyper missing"
{ echo -n "forge: "; forge --version; } || echo "forge missing"
{ echo -n "era_test_node: "; era_test_node --version; } || echo "era_test_node missing"

echo
echo "== Compile (EVM) =="
npx hardhat compile

echo
echo "== Compile (zkSync) =="
npx hardhat compile --network zkSyncSepoliaTestnet

echo
echo "All good ✅"
