#!/usr/bin/env bash
set -euo pipefail
ROOT=${ROOT_DIR:-/workspaces/Vfide}
SRC_DIR="$ROOT/contracts-min"
OUT_DIR="$ROOT/.instrumented"
mkdir -p "$OUT_DIR"

if ! command -v scribble >/dev/null 2>&1; then
  echo "Scribble not installed. Install via: npm i -g @consensys/scribble" >&2
  exit 1
fi

echo "[Scribble] Instrumenting specs from $SRC_DIR to $OUT_DIR ..."
scribble "$SRC_DIR" --output-mode files --instrument "if_succeeds" --output "$OUT_DIR"
echo "[Scribble] Done. Point Hardhat/Foundry to $OUT_DIR to run tests against instrumented contracts."
