'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, X } from 'lucide-react';
import { getEnv } from '@/lib/env';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 *
 * Registers the service worker on app mount for:
 * - Offline caching
 * - Background sync
 * - Push notifications
 * - Faster repeat visits
 *
 * Also renders a non-blocking "Update available" banner when the service
 * worker detects a new build. Replaces the old window.confirm() dialog
 * (which is blocking, unstyled, and silently no-ops on iOS in-app browsers).
 */
export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    const env = getEnv();

    // Only register in production or if explicitly enabled
    if (process.env.NODE_ENV === 'production' || env.NEXT_PUBLIC_ENABLE_SW) {
      registerServiceWorker().then((registration) => {
        if (registration) {
          logger.info('[VFIDE] Service worker registered successfully');
        }
      });
    }
  }, []);

  // Listen for SW update events dispatched by lib/serviceWorkerRegistration.ts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { apply?: () => void } | undefined;
      if (detail?.apply) {
        setApplyUpdate(() => detail.apply!);
        setUpdateAvailable(true);
      }
    };
    window.addEventListener('vfide:sw-update-available', handler);
    return () => window.removeEventListener('vfide:sw-update-available', handler);
  }, []);

  const handleApply = useCallback(() => {
    if (applyUpdate) applyUpdate();
  }, [applyUpdate]);

  const handleDismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 bg-zinc-900 border border-cyan-500/30 rounded-2xl px-4 py-3 shadow-2xl shadow-cyan-500/10">
            <RefreshCcw size={18} className="text-cyan-400 shrink-0" />
            <div className="flex-1 text-sm text-zinc-200">
              A new version is available.
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-zinc-900 text-xs font-semibold hover:bg-cyan-400 transition-colors"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ServiceWorkerRegistration;
