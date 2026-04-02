#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Scaffold a new page with colocated components folder
#
# Usage: bash scripts/new-page.sh (finance)/vault/recover
# Creates:
#   app/(finance)/vault/recover/page.tsx
#   app/(finance)/vault/recover/loading.tsx
#   app/(finance)/vault/recover/error.tsx
#   app/(finance)/vault/recover/components/
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/new-page.sh <route-path>"
  echo "  e.g.: bash scripts/new-page.sh (finance)/vault/recover"
  exit 1
fi

ROUTE="$1"
DIR="app/$ROUTE"
NAME=$(basename "$ROUTE" | sed 's/.*/\u&/' | sed 's/-\(.\)/\U\1/g')  # kebab → PascalCase

mkdir -p "$DIR/components"

# page.tsx
if [ ! -f "$DIR/page.tsx" ]; then
cat > "$DIR/page.tsx" << EOF
'use client';

import { Footer } from '@/components/layout/Footer';

export default function ${NAME}Page() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-12">
          <h1 className="text-4xl font-bold text-white mb-4">${NAME}</h1>
          {/* TODO: implement */}
        </div>
      </main>
      <Footer />
    </>
  );
}
EOF
echo "  ✓ $DIR/page.tsx"
fi

# loading.tsx
if [ ! -f "$DIR/loading.tsx" ]; then
cat > "$DIR/loading.tsx" << 'EOF'
export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}
EOF
echo "  ✓ $DIR/loading.tsx"
fi

# error.tsx
if [ ! -f "$DIR/error.tsx" ]; then
cat > "$DIR/error.tsx" << 'EOF'
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
        <p className="text-gray-400 mb-6">{error.message}</p>
        <button onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold">
          Try again
        </button>
      </div>
    </div>
  );
}
EOF
echo "  ✓ $DIR/error.tsx"
fi

echo ""
echo "  Scaffolded: $DIR/"
echo "  Components: $DIR/components/ (empty, ready for extraction)"
