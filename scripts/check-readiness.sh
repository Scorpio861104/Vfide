#!/usr/bin/env bash
set -euo pipefail

ok=()
miss=()

check_bin() {
  local name="$1"; shift
  local ver_cmd=("$@")
  if command -v "$name" >/dev/null 2>&1; then
    local ver
    if ver=$("${ver_cmd[@]}" 2>/dev/null | head -n1); then
      ok+=("$name: $ver")
    else
      ok+=("$name: present")
    fi
  else
    miss+=("$name")
  fi
}

# Core
check_bin node node -v
check_bin npm npm -v
check_bin npx npx --version
check_bin git git --version

# Hardhat + EVM tools
check_bin hardhat npx --no-install hardhat --version || true
check_bin solhint solhint --version || true
check_bin surya surya --version || true

# Coverage + docgen
check_bin nyc nyc --version || true
check_bin solidity-coverage npx --no-install hardhat coverage --version || true
check_bin solidity-docgen solidity-docgen --version || true

# Foundry
check_bin forge forge --version || true
check_bin cast cast --version || true

# zkSync stack
check_bin zksolc zksolc --version || true
check_bin zkvyper zkvyper --version || true
check_bin era_test_node era_test_node --version || true

# Security tools
check_bin slither slither --version || true
check_bin echidna echidna --version || true
check_bin docker docker --version || true
check_bin myth analyze myth --version || true
check_bin medusa medusa --version || true

echo "=== Tool Readiness Summary ==="
printf 'OK: %s\n' "${ok[@]}" | sed 's/^/ - /'

if ((${#miss[@]} > 0)); then
  echo "Missing:"
  printf ' - %s\n' "${miss[@]}"
  echo
  echo "Hints:"
  echo " - zkSync toolchain: bash scripts/install-zksync-tools.sh"
  echo " - Foundry only:     bash scripts/install-foundry.sh"
  echo " - Slither:          python3 -m venv slither_env && source slither_env/bin/activate && pip install slither && slither --version"
  echo " - Echidna:          see https://github.com/crytic/echidna (or run via Docker)"
  echo " - Mythril:          docker pull mythril/myth"
  echo " - Medusa:           npm i -g medusa-cli (or follow project docs)"
  exit 1
fi

echo "All required tools detected."
