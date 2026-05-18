#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8552}"
RPC_URL_VALUE="http://127.0.0.1:${PORT}"
LOG_FILE="/tmp/hardhat-merchant-payment-escrow-node.log"

npx hardhat node --hostname 127.0.0.1 --port "${PORT}" >"${LOG_FILE}" 2>&1 &
NODE_PID=$!

cleanup() {
  kill "${NODE_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -s -X POST "${RPC_URL_VALUE}" \
    -H "content-type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    >/dev/null; then
    break
  fi
  sleep 1
done

RPC_URL="${RPC_URL_VALUE}" npm run -s contract:verify:merchant-payment-escrow
