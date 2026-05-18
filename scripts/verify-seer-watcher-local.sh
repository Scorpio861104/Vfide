#!/usr/bin/env bash
set -euo pipefail

CHALLENGE_PORT="${SEER_CHALLENGE_PORT:-8555}"
RUNTIME_PORT="${SEER_RUNTIME_PORT:-8557}"
POLICY_PORT="${SEER_POLICY_PORT:-8560}"
MAX_AUTONOMY_PORT="${SEER_MAX_AUTONOMY_PORT:-8562}"

npm run -s contract:verify:seer:size
PORT="${CHALLENGE_PORT}" npm run -s contract:verify:seer:challenge-event:local
PORT="${RUNTIME_PORT}" npm run -s contract:verify:seer:reason-codes:runtime:local
PORT="${POLICY_PORT}" npm run -s contract:verify:seer:policy-delays:local
PORT="${MAX_AUTONOMY_PORT}" npm run -s contract:verify:seer:max-autonomy:local
