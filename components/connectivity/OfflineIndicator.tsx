'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncStatus = () => setIsOnline(window.navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRecoveryNotice(true);
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = setTimeout(() => setShowRecoveryNotice(false), 3000);
    };

    const handleOffline = () => {
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
      setShowRecoveryNotice(false);
      setIsOnline(false);
    };

    syncStatus();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    };
  }, []);

  if (isOnline && !showRecoveryNotice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-3 bottom-3 z-[95] rounded-xl border px-4 py-3 shadow-2xl backdrop-blur md:left-auto md:right-3 md:max-w-md ${
        isOnline
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
          : 'border-amber-500/40 bg-amber-500/15 text-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-black/20 p-2">
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isOnline ? 'Back online' : 'You are offline'}
          </p>
          <p className="mt-1 text-xs text-inherit/90">
            {isOnline
              ? 'Pending updates can sync again.'
              : 'Cached pages stay available. Reconnect to sync payments, messages, and fresh balances.'}
          </p>
        </div>

        {isOnline && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 bg-black/20 px-2 text-current transition hover:bg-black/30"
            aria-label="Refresh now that the connection is restored"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
