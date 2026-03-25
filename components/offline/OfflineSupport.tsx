'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  CloudOff, 
  Check,
  Clock,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
}

interface _OfflineContextValue {
  isOnline: boolean;
  isReconnecting: boolean;
  queuedActions: QueuedAction[];
  addToQueue: (type: string, payload: unknown) => string;
  removeFromQueue: (id: string) => void;
  retryAction: (id: string) => void;
  retryAll: () => void;
  clearQueue: () => void;
}

// ==================== HOOK ====================

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const processingRef = useRef(false);

  // Check initial online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      // Process queue after reconnection
      setTimeout(() => {
        setIsReconnecting(false);
        processQueue();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vfide_offline_queue');
    if (saved) {
      try {
        setQueuedActions(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem('vfide_offline_queue', JSON.stringify(queuedActions));
  }, [queuedActions]);

  const addToQueue = useCallback((type: string, payload: unknown): string => {
    const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const action: QueuedAction = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending',
    };
    setQueuedActions((prev) => [...prev, action]);
    return id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueuedActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAction = useCallback((id: string, updates: Partial<QueuedAction>) => {
    setQueuedActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !navigator.onLine) return;
    processingRef.current = true;

    const pendingActions = queuedActions.filter((a) => a.status === 'pending');

    for (const action of pendingActions) {
      updateAction(action.id, { status: 'processing' });

      try {
        // Process based on action type
        // This should be customized based on your app's needs
        await processAction(action);
        removeFromQueue(action.id);
      } catch (_error) {
        if (action.retries >= action.maxRetries) {
          updateAction(action.id, { status: 'failed' });
        } else {
          updateAction(action.id, {
            status: 'pending',
            retries: action.retries + 1,
          });
        }
      }
    }

    processingRef.current = false;
  }, [queuedActions, removeFromQueue, updateAction]);

  const retryAction = useCallback(async (id: string) => {
    const action = queuedActions.find((a) => a.id === id);
    if (!action || !navigator.onLine) return;

    updateAction(id, { status: 'processing' });

    try {
      await processAction(action);
      removeFromQueue(id);
    } catch {
      updateAction(id, { status: 'failed', retries: action.retries + 1 });
    }
  }, [queuedActions, removeFromQueue, updateAction]);

  const retryAll = useCallback(() => {
    queuedActions
      .filter((a) => a.status === 'failed')
      .forEach((a) => updateAction(a.id, { status: 'pending', retries: 0 }));
    processQueue();
  }, [queuedActions, updateAction, processQueue]);

  const clearQueue = useCallback(() => {
    setQueuedActions([]);
  }, []);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && queuedActions.some((a) => a.status === 'pending')) {
      processQueue();
    }
  }, [isOnline, queuedActions, processQueue]);

  return {
    isOnline,
    isReconnecting,
    queuedActions,
    addToQueue,
    removeFromQueue,
    retryAction,
    retryAll,
    clearQueue,
  };
}

// ==================== PROCESS ACTION ====================

async function processAction(action: QueuedAction): Promise<void> {
  // Example action processing - customize for your app
  switch (action.type) {
    case 'send_message':
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      });
      break;
    case 'update_profile':
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      });
      break;
    case 'send_reaction':
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      });
      break;
    default:
      logger.warn('Unknown action type:', action.type);
  }
}

// ==================== OFFLINE BANNER ====================

interface OfflineBannerProps {
  isOnline: boolean;
  isReconnecting: boolean;
  queuedCount: number;
  onRetryAll?: () => void;
}

export function OfflineBanner({ isOnline, isReconnecting, queuedCount, onRetryAll }: OfflineBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  if (dismissed || (isOnline && !isReconnecting && queuedCount === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className={`
          fixed top-0 left-0 right-0 z-[100] px-4 py-3 flex items-center justify-center gap-3
          ${isOnline 
            ? isReconnecting 
              ? 'bg-yellow-500/90 text-yellow-950' 
              : 'bg-green-500/90 text-green-950'
            : 'bg-red-500/90 text-white'
          }
        `}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">You&apos;re offline</span>
            {queuedCount > 0 && (
              <span className="text-sm opacity-80">
                ({queuedCount} action{queuedCount !== 1 ? 's' : ''} queued)
              </span>
            )}
          </>
        ) : isReconnecting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-medium">Reconnecting...</span>
            {queuedCount > 0 && (
              <span className="text-sm opacity-80">
                Syncing {queuedCount} queued action{queuedCount !== 1 ? 's' : ''}
              </span>
            )}
          </>
        ) : queuedCount > 0 ? (
          <>
            <Clock className="w-5 h-5" />
            <span className="font-medium">{queuedCount} action{queuedCount !== 1 ? 's' : ''} pending</span>
            {onRetryAll && (
              <button
                onClick={onRetryAll}
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Retry All
              </button>
            )}
          </>
        ) : (
          <>
            <Wifi className="w-5 h-5" />
            <span className="font-medium">Back online!</span>
            <button
              onClick={() => setDismissed(true)}
              className="ml-2 text-sm opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== OFFLINE INDICATOR ====================

interface OfflineIndicatorProps {
  isOnline: boolean;
  queuedCount: number;
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
}

export function OfflineIndicator({ isOnline, queuedCount, position = 'bottom-right' }: OfflineIndicatorProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (isOnline && queuedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed ${positionClasses[position]} z-40`}
    >
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
        ${isOnline 
          ? 'bg-yellow-500/90 text-yellow-950' 
          : 'bg-red-500/90 text-white'
        }
      `}>
        {isOnline ? (
          <>
            <Upload className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">{queuedCount} pending</span>
          </>
        ) : (
          <>
            <CloudOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ==================== QUEUE VIEWER ====================

interface QueueViewerProps {
  actions: QueuedAction[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onRetryAll: () => void;
  onClear: () => void;
}

export function QueueViewer({ actions, onRetry, onRemove, onRetryAll, onClear }: QueueViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (actions.length === 0) return null;

  const failedCount = actions.filter((a) => a.status === 'failed').length;
  const pendingCount = actions.filter((a) => a.status === 'pending').length;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full shadow-lg font-medium
          ${failedCount > 0 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-yellow-950'}
        `}
      >
        <Clock className="w-4 h-4" />
        {actions.length} Queued
      </motion.button>

      {/* Queue Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-14 right-0 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white">Queued Actions</h3>
              <div className="flex gap-2">
                {failedCount > 0 && (
                  <button
                    onClick={onRetryAll}
                    className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                  >
                    Retry All
                  </button>
                )}
                <button
                  onClick={onClear}
                  className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-2 bg-zinc-800/50 flex gap-4 text-xs">
              <span className="text-yellow-400">
                <Clock className="w-3 h-3 inline mr-1" />
                {pendingCount} pending
              </span>
              <span className="text-red-400">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {failedCount} failed
              </span>
            </div>

            {/* Actions List */}
            <div className="max-h-60 overflow-y-auto p-2">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-lg mb-1 last:mb-0"
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${action.status === 'pending' ? 'bg-yellow-500/20' :
                      action.status === 'processing' ? 'bg-blue-500/20' :
                      'bg-red-500/20'}
                  `}>
                    {action.status === 'processing' ? (
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : action.status === 'failed' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {action.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(action.timestamp).toLocaleTimeString()}
                      {action.retries > 0 && ` • ${action.retries} retries`}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    {action.status === 'failed' && (
                      <button
                        onClick={() => onRetry(action.id)}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                        title="Retry"
                      >
                        <RefreshCw className="w-4 h-4 text-cyan-400" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(action.id)}
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                      title="Remove"
                    >
                      <Check className="w-4 h-4 text-zinc-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default useOfflineSupport;
