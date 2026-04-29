#!/usr/bin/env bash
set -euo pipefail

mode="${1:-default}"

if [[ "$mode" == "generated" ]]; then
  find test/hardhat/generated -name '*.test.ts' -print0 |
    while IFS= read -r -d '' file; do
      node --import tsx --test --test-isolation=none "$file"
    done
  exit 0
fi

find test/hardhat -name '*.test.ts' \
  ! -path 'test/hardhat/generated/*' \
  ! -path 'test/hardhat/lending/*' \
  -print0 |
  while IFS= read -r -d '' file; do
    node --import tsx --test --test-isolation=none "$file"
  done