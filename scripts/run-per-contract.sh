#!/usr/bin/env bash
set -euo pipefail

# Run test tools individually per contract
# Usage:
#   bash scripts/run-per-contract.sh               # run for all top-level contracts
#   bash scripts/run-per-contract.sh -c VFIDEToken  # run for one contract
#   bash scripts/run-per-contract.sh -t hardhat     # run only Hardhat tests
#   bash scripts/run-per-contract.sh -t foundry     # run only Foundry tests
#   bash scripts/run-per-contract.sh -f 500         # set Foundry fuzz runs

TOOLS="hardhat,foundry"
CONTRACT=""
FUZZ_RUNS="300"
FULL_MODE=0

while getopts ":c:t:f:hF-:" opt; do
  case $opt in
    c) CONTRACT="$OPTARG" ;;
    t) TOOLS="$OPTARG" ;;
    f) FUZZ_RUNS="$OPTARG" ;;
    F) FULL_MODE=1 ;;
    -) case "$OPTARG" in
         full) FULL_MODE=1 ;;
         *) echo "Unknown long option --$OPTARG"; exit 2 ;;
       esac ;;
    h)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *) echo "Unknown option -$OPTARG"; exit 2 ;;
  esac
done

# Build contract list (top-level only)
mapfile -t CONTRACTS < <(find contracts -maxdepth 1 -type f -name "*.sol" -printf "%f\n" | sed 's/.sol$//' | sort)

if [[ -n "$CONTRACT" ]]; then
  if printf '%s\n' "${CONTRACTS[@]}" | grep -qx "$CONTRACT"; then
    CONTRACTS=([0]="$CONTRACT")
  else
    echo "Contract '$CONTRACT' not found among: ${CONTRACTS[*]}" >&2
    exit 1
  fi
fi

want_hardhat=0
want_foundry=0
IFS=',' read -ra parts <<< "$TOOLS"
for p in "${parts[@]}"; do
  case "${p,,}" in
    hardhat) want_hardhat=1 ;;
    foundry) want_foundry=1 ;;
    *) echo "Unknown tool '$p' (supported: hardhat, foundry)"; exit 2 ;;
  esac
done

# Compile once for speed when running Hardhat
if [[ $want_hardhat -eq 1 ]]; then
  echo "==> Hardhat compile (once)"
  if [[ $FULL_MODE -eq 1 ]]; then
    npx hardhat compile
  else
    FAST_TESTS=1 npx hardhat compile
  fi
fi

failures=0
results=()

run_hardhat() {
  local name="$1"
  echo "\n==> Hardhat tests for $name"
  # Grep by contract name; FAST_TESTS skips archive suites
  if [[ $FULL_MODE -eq 1 ]]; then
    if npx hardhat test --no-compile --grep "$name"; then
      results+=("hardhat:$name:ok")
    else
      results+=("hardhat:$name:fail")
      failures=$((failures+1))
    fi
    return
  fi
  if FAST_TESTS=1 npx hardhat test --no-compile --grep "$name"; then
    results+=("hardhat:$name:ok")
  else
    results+=("hardhat:$name:fail")
    failures=$((failures+1))
  fi
}

run_foundry() {
  local name="$1"
  echo "\n==> Foundry tests for $name (fuzz-runs=$FUZZ_RUNS)"
  if FOUNDRY_PROFILE=fuzz forge test --match-contract "$name" --fuzz-runs "$FUZZ_RUNS"; then
    results+=("foundry:$name:ok")
  else
    results+=("foundry:$name:fail")
    failures=$((failures+1))
  fi
}

for name in "${CONTRACTS[@]}"; do
  echo "\n============================"
  echo "Contract: $name"
  echo "============================"
  [[ $want_hardhat -eq 1 ]] && run_hardhat "$name"
  [[ $want_foundry -eq 1 ]] && run_foundry  "$name"
done

echo "\n==> Summary"
printf '%s\n' "${results[@]}" | sed 's/:/ -> /g'

if [[ $failures -gt 0 ]]; then
  echo "Failures: $failures" >&2
  exit 1
fi

echo "All per-contract runs passed."
