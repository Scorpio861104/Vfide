/**
 * Offline Indicator Component
 * 
 * Visual indicator showing online/offline status and sync queue.
 */

'use client';

import { useAnnounce } from '@/lib/accessibility';
import { SyncStatus, useOnlineStatus, useSyncQueue } from '@/lib/offline';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Cloud,
    CloudOff,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
    X
} from 'lucide-react';
import { useState } from 'react';

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const { queue, syncing, pendingCount, failedCount, sync, retryFailed, clearQueue } = useSyncQueue();
  const { announce } = useAnnounce();
  const [expanded, setExpanded] = useState(false);

  const handleSync = async () => {
    try {
      const result = await sync();
      if (result) {
        announce(`Synced ${result.synced} items, ${result.failed} failed`, 'polite');
      }
    } catch {
      announce('Sync failed', 'assertive');
    }
  };

  const handleRetry = async () => {
    try {
      await retryFailed();
      announce('Retrying failed items', 'polite');
    } catch {
      announce('Retry failed', 'assertive');
    }
  };

  const handleClear = async () => {
    try {
      await clearQueue();
      announce('Queue cleared', 'polite');
    } catch {
      announce('Failed to clear queue', 'assertive');
    }
  };

  // Don't show if online and no pending/failed items
  if (online && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Compact View */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between gap-3 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-3">
            {online ? (
              <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-400" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-red-400" />
              </div>
            )}

            <div className="text-left">
              <div className="text-white font-medium flex items-center gap-2">
                {online ? 'Online' : 'Offline'}
                {syncing && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              </div>
              <div className="text-sm text-gray-400">
                {pendingCount > 0 && `${pendingCount} pending`}
                {pendingCount > 0 && failedCount > 0 && ', '}
                {failedCount > 0 && `${failedCount} failed`}
              </div>
            </div>
          </div>

          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Expanded View */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-zinc-800"
            >
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {/* Status Info */}
                <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Connection</span>
                    <span className={online ? 'text-green-400' : 'text-red-400'}>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Pending Actions</span>
                    <span className="text-white">{pendingCount}</span>
                  </div>
                  {failedCount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Failed Actions</span>
                      <span className="text-red-400">{failedCount}</span>
                    </div>
                  )}
                </div>

                {/* Queue Items */}
                {queue.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-400">Queue</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {queue.slice(0, 5).map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-2 bg-zinc-900 rounded text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {action.status === SyncStatus.PENDING && (
                              <Cloud className="w-3 h-3 text-blue-400" />
                            )}
                            {action.status === SyncStatus.SYNCING && (
                              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                            )}
                            {action.status === SyncStatus.SYNCED && (
                              <Check className="w-3 h-3 text-green-400" />
                            )}
                            {action.status === SyncStatus.FAILED && (
                              <X className="w-3 h-3 text-red-400" />
                            )}
                            <span className="text-gray-400">{action.type}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              action.status === SyncStatus.PENDING
                                ? 'bg-blue-900/30 text-blue-400'
                                : action.status === SyncStatus.SYNCING
                                ? 'bg-blue-900/30 text-blue-400'
                                : action.status === SyncStatus.SYNCED
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-red-900/30 text-red-400'
                            }`}
                          >
                            {action.status}
                          </span>
                        </div>
                      ))}
                      {queue.length > 5 && (
                        <div className="text-center text-gray-500 text-xs py-1">
                          +{queue.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {online && pendingCount > 0 && (
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Sync Now
                        </>
                      )}
                    </button>
                  )}
                  {failedCount > 0 && (
                    <button
                      onClick={handleRetry}
                      className="flex-1 px-3 py-2 bg-orange-900/30 hover:bg-orange-900/50 text-orange-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </button>
                  )}
                  {queue.length > 0 && (
                    <button
                      onClick={handleClear}
                      className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm rounded-lg transition-colors"
                      title="Clear queue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Simple offline banner (alternative to indicator)
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="fixed top-0 left-0 right-0 z-50 bg-red-900/30 border-b border-red-900/50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-2">
        <CloudOff className="w-5 h-5 text-red-400" />
        <span className="text-red-400 font-medium">
          You&apos;re offline. Changes will sync when you&apos;re back online.
        </span>
      </div>
    </motion.div>
  );
}
