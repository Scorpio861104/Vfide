#!/usr/bin/env bash
set -euo pipefail

echo "[zkSync Setup] Starting installation..."

try_cmd() {
  echo "> $*"
  bash -lc "$*" || true
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  if has_cmd sudo; then SUDO="sudo"; fi
fi

ROOT_DIR="${ROOT_DIR:-/workspaces/Vfide}"
cd "$ROOT_DIR"

echo "[zkSync Setup] Installing system packages (curl, jq, build tools)..."
$SUDO bash -lc 'export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y \
  curl wget jq ca-certificates unzip xz-utils \
  build-essential pkg-config libssl-dev git'

echo "[zkSync Setup] Ensuring Rust toolchain (rustup/cargo) installed..."
if ! has_cmd cargo; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | bash -s -- -y
fi
# shellcheck disable=SC1091
. "$HOME/.cargo/env" 2>/dev/null || true

echo "[zkSync Setup] Installing Node dependencies (npm ci) and zkSync ethers..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm install -D zksync-ethers@^6 || true

echo "[zkSync Setup] Installing zksolc matching hardhat.config.js (v1.5.7)..."
ZKSOLC_VER="v1.5.7"
ZKSOLC_API="https://api.github.com/repos/matter-labs/zksolc-bin/releases/tags/${ZKSOLC_VER}"
ZKSOLC_URL=$(curl -sL "$ZKSOLC_API" | jq -r '.assets[] | select(.name|test("linux.*(amd64|x86_64).*musl")) | .browser_download_url' | head -n1)
if [ -n "${ZKSOLC_URL:-}" ] && [ "${ZKSOLC_URL}" != "null" ]; then
  curl -L "$ZKSOLC_URL" -o /tmp/zksolc && chmod +x /tmp/zksolc && $SUDO mv /tmp/zksolc /usr/local/bin/zksolc
else
  echo "[zkSync Setup][WARN] Could not resolve zksolc asset URL for ${ZKSOLC_VER}. The hardhat plugin may auto-download." >&2
fi

echo "[zkSync Setup] Best-effort install of latest zkvyper..."
ZKV_TAG=$(curl -sL https://api.github.com/repos/matter-labs/zkvyper-bin/releases/latest | jq -r .tag_name || true)
if [ -n "${ZKV_TAG:-}" ] && [ "${ZKV_TAG}" != "null" ]; then
  ZKV_URL=$(curl -sL "https://api.github.com/repos/matter-labs/zkvyper-bin/releases/tags/${ZKV_TAG}" | jq -r '.assets[] | select(.name|test("linux.*(amd64|x86_64)")) | .browser_download_url' | head -n1)
  if [ -n "${ZKV_URL:-}" ] && [ "${ZKV_URL}" != "null" ]; then
    curl -L "$ZKV_URL" -o /tmp/zkvyper && chmod +x /tmp/zkvyper && $SUDO mv /tmp/zkvyper /usr/local/bin/zkvyper || true
  fi
fi

echo "[zkSync Setup] Installing Foundry (forge/cast)..."
if ! has_cmd forge; then
  curl -L https://foundry.paradigm.xyz | bash
  "$HOME/.foundry/bin/foundryup"
else
  try_cmd "foundryup"
fi

echo "[zkSync Setup] Installing zkSync Foundry tool (best-effort via cargo)..."
if has_cmd cargo; then
  try_cmd "cargo install --git https://github.com/matter-labs/foundry-zksync --locked foundry-zksync"
fi

echo "[zkSync Setup] Installing zkSync Era local test node (cargo era_test_node)..."
if has_cmd cargo; then
  # era_test_node installs as a cargo binary named `era_test_node`
  try_cmd "cargo install --locked --git https://github.com/matter-labs/era-test-node era_test_node"
fi

echo "[zkSync Setup] Verifying installations..."
try_cmd "node -v"
try_cmd "npm -v"
try_cmd "npx --no-install hardhat --version"
try_cmd "zksolc --version"
try_cmd "zkvyper --version"
try_cmd "era_test_node --version"
try_cmd "forge --version"

echo "[zkSync Setup] Done. You can now compile and run tests."
echo " - Compile (EVM):            npx hardhat compile"
echo " - Compile (zkSync binary):  npx hardhat compile --network zkSyncSepoliaTestnet"
echo " - Run zkSync tests:         npm run test:zksync"
echo " - Start local Era node:     era_test_node --dev"
