#!/bin/bash
# Scaffold a new page with colocated loading/error states.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/new-page.sh <route-path>"
  echo "  e.g.: bash scripts/new-page.sh finance/vault/recover"
  exit 1
fi

ROUTE="$1"
DIR="app/$ROUTE"
NAME=$(basename "$ROUTE" | sed 's/.*/\u&/' | sed 's/-\(.\)/\U\1/g')

mkdir -p "$DIR/components"

if [ ! -f "$DIR/page.tsx" ]; then
cat > "$DIR/page.tsx" << EOF
'use client';

import { Footer } from '@/components/layout/Footer';

export default function ${NAME}Page() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <h1 className="mb-4 text-4xl font-bold text-white">${NAME}</h1>
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

if [ ! -f "$DIR/loading.tsx" ]; then
cat > "$DIR/loading.tsx" << 'EOF'
export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500" />
    </div>
  );
}
EOF
  echo "  ✓ $DIR/loading.tsx"
fi

if [ ! -f "$DIR/error.tsx" ]; then
cat > "$DIR/error.tsx" << 'EOF'
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="mb-3 text-2xl font-bold text-white">Something went wrong</h2>
        <p className="mb-6 text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-bold text-white"
        >
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
echo "  Components: $DIR/components/"
