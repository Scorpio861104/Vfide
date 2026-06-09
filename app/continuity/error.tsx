'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ContinuityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Continuity route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 mx-auto bg-red-600/20 border-2 border-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Continuity Error</h1>
        <p className="text-zinc-400 mb-2">
          Continuity state could not be loaded. Your guardians, recovery, and inheritance settings are unaffected - retry to view them.
        </p>
        {error.digest && (
          <p className="text-sm text-zinc-500 mb-6 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <RefreshCw size={15} /> Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
          >
            <Home size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
