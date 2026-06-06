#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8552}"
RPC_URL_VALUE="http://127.0.0.1:${PORT}"
LOG_FILE="/tmp/hardhat-merchant-payment-escrow-node.log"

# Kill any stale process on the port before starting
if command -v lsof >/dev/null 2>&1; then
  EXISTING_PIDS="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${EXISTING_PIDS}" ]]; then
    kill ${EXISTING_PIDS} >/dev/null 2>&1 || true
    sleep 1
  fi
fi

# Use hardhat.unlimited.config.ts so MerchantPortal (26KB runtime) deploys without
# hitting EIP-170 / EIP-3860 initcode limits on the local hardhat node.
npx hardhat node --config hardhat.unlimited.config.ts --hostname 127.0.0.1 --port "${PORT}" >"${LOG_FILE}" 2>&1 &
NODE_PID=$!

cleanup() {
  kill "${NODE_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Wait until hardhat prints its ready message or the process dies (up to 90s).
# We grep the log file rather than using curl, because curl -s returns exit 0
# even on ECONNREFUSED, which causes a false-positive break from the wait loop.
READY=0
for _ in $(seq 1 90); do
  if ! kill -0 "${NODE_PID}" >/dev/null 2>&1; then
    echo "Hardhat node exited unexpectedly. Log:" >&2
    cat "${LOG_FILE}" >&2 || true
    exit 1
  fi
  if grep -q "Started HTTP and WebSocket JSON-RPC server" "${LOG_FILE}" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" -eq 0 ]]; then
  echo "Hardhat node did not become ready within 90s. Log:" >&2
  cat "${LOG_FILE}" >&2 || true
  exit 1
fi

RPC_URL="${RPC_URL_VALUE}" npx tsx scripts/verify-merchant-payment-escrow-invariants.ts
