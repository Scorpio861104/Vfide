#!/bin/bash
# Scaffold a new component file.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/new-component.sh <path/ComponentName>"
  echo "  e.g.: bash scripts/new-component.sh components/merchant/OrderTracker"
  exit 1
fi

FULL_PATH="$1"
DIR=$(dirname "$FULL_PATH")
NAME=$(basename "$FULL_PATH" .tsx)
FILE="$DIR/$NAME.tsx"

mkdir -p "$DIR"

if [ -f "$FILE" ]; then
  echo "  ⊘ $FILE already exists"
  exit 0
fi

cat > "$FILE" << EOF
'use client';

interface ${NAME}Props {
  // TODO: define props
}

export function ${NAME}({}: ${NAME}Props) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white">${NAME}</h3>
      {/* TODO: implement */}
    </div>
  );
}
EOF

echo "  ✓ $FILE"
