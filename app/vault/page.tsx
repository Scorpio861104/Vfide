'use client';

export const dynamic = 'force-dynamic';

import { lazy, Suspense } from 'react';

const VaultContent = lazy(() => import('./components/VaultContent').then(m => ({ default: m.VaultContent })));

function VaultSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="container mx-auto px-3 sm:px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-white/5 rounded-2xl w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-white/5 rounded-2xl" />
            <div className="h-40 bg-white/5 rounded-2xl" />
            <div className="h-40 bg-white/5 rounded-2xl" />
          </div>
          <div className="h-80 bg-white/5 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={<VaultSkeleton />}>
      <VaultContent />
    </Suspense>
  );
}
