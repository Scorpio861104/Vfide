#!/usr/bin/env bash
set -euo pipefail

if ! command -v forge >/dev/null 2>&1; then
  echo "Installing Foundry (forge/cast)...";
  curl -L https://foundry.paradigm.xyz | bash
  export PATH="$HOME/.foundry/bin:$PATH"
  foundryup
else
  echo "Foundry already installed";
fi

echo "Foundry version:"; forge --version || true