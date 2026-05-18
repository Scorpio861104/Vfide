#!/usr/bin/env bash
set -euo pipefail

if rg -n "\bisValidSignature\b" contracts --glob "**/*.sol" >/dev/null 2>&1; then
  echo "ERROR: EIP-1271 isValidSignature implementation detected in contracts/."
  rg -n "\bisValidSignature\b" contracts --glob "**/*.sol"
  echo "If intentional, add explicit allowlist handling in auth validation before enabling this."
  exit 1
fi

echo "OK: No EIP-1271 isValidSignature implementations found in contracts/."
