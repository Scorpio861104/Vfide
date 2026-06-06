#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8565}"
RPC_URL_VALUE="http://127.0.0.1:${PORT}"
LOG_FILE="/tmp/hardhat-card-bound-vault-node.log"

if command -v lsof >/dev/null 2>&1; then
  EXISTING_PIDS="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${EXISTING_PIDS}" ]]; then
    kill ${EXISTING_PIDS} >/dev/null 2>&1 || true
    sleep 1
  fi
fi

npx hardhat --network hardhat node --config hardhat.unlimited.config.ts --hostname 127.0.0.1 --port "${PORT}" >"${LOG_FILE}" 2>&1 &
NODE_PID=$!

cleanup() {
  kill "${NODE_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

READY=0
for _ in $(seq 1 60); do
  if ! kill -0 "${NODE_PID}" >/dev/null 2>&1; then
    cat "${LOG_FILE}" >&2 || true
    echo "Failed to start hardhat node on port ${PORT}" >&2
    exit 1
  fi

  RESPONSE="$(curl -fsS -X POST "${RPC_URL_VALUE}" \
    -H "content-type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    2>/dev/null || true)"
  if [[ "${RESPONSE}" == *'"result"'* ]]; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" != "1" ]]; then
  cat "${LOG_FILE}" >&2 || true
  echo "Hardhat node on port ${PORT} did not become JSON-RPC ready" >&2
  exit 1
fi

RPC_URL="${RPC_URL_VALUE}" npx tsx scripts/verify-card-bound-vault-security.ts
