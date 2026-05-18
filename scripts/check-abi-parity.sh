#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

KNOWN_ORPHAN_ABIS=(
  DevReserveVesting
  ERC20
)

contracts=$(
  find contracts \
    \( -path '*/lib/*' -o -path '*/interfaces/*' -o -path '*/mocks/*' \) -prune -o \
    -name '*.sol' -print \
  | xargs -n1 basename \
  | sed 's/\.sol$//' \
  | sort -u
)

abis=$(
  find lib/abis -maxdepth 1 -type f -name '*.json' -print \
  | xargs -n1 basename \
  | sed 's/\.json$//' \
  | sort -u
)

orphans=$(comm -23 <(printf '%s\n' "$abis") <(printf '%s\n' "$contracts"))

for known in "${KNOWN_ORPHAN_ABIS[@]}"; do
  orphans=$(printf '%s\n' "$orphans" | grep -v -x "$known" || true)
done

if [[ -n "$orphans" ]]; then
  echo "ABIs without matching contract:" >&2
  echo "$orphans" >&2
  exit 1
fi

echo "ABI parity (file-name) check passed."
