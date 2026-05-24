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

for _ in $(seq 1 45); do
  if ! kill -0 "${NODE_PID}" >/dev/null 2>&1; then
    cat "${LOG_FILE}" >&2 || true
    echo "Hardhat node exited unexpectedly on port ${PORT}" >&2
    exit 1
  fi

  if curl -s -X POST "${RPC_URL_VALUE}" \
    -H "content-type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    >/dev/null; then
    break
  fi
  sleep 1
done

RPC_URL="${RPC_URL_VALUE}" npx tsx scripts/verify-merchant-payment-escrow-invariants.ts
