#!/usr/bin/env bash
set -euo pipefail

# Run from repo root (works no matter where you call it from)
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# Where to write logs (defaults to /tmp)
LOG_DIR="${LOG_DIR:-/tmp}"
mkdir -p "$LOG_DIR"

stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
log_file="$LOG_DIR/test-all-$stamp.log"

echo "Running: npm run test:all"
echo "Logging to: $log_file"
echo

# Stream output AND write log
npm run test:all 2>&1 | tee "$log_file"

# Propagate npm's exit code through the pipe
exit_code=${PIPESTATUS[0]}

echo
echo "Done. Exit code: $exit_code"
echo "Log: $log_file"
exit "$exit_code"
