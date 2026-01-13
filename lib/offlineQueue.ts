/**
 * Offline Queue Manager
 * 
 * Manages queued operations when offline and syncs when back online.
 * Uses IndexedDB for persistence.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface QueuedOperation {
  id: string;
  type: 'transfer' | 'message' | 'vote' | 'stake' | 'custom';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface OfflineQueueState {
  isOnline: boolean;
  queue: QueuedOperation[];
  isSyncing: boolean;
  lastSyncTime: number | null;
}

// ============================================================================
// IndexedDB Setup
// ============================================================================

const DB_NAME = 'vfide-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function getAllFromStore(): Promise<QueuedOperation[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function addToStore(operation: QueuedOperation): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(operation);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function updateInStore(operation: QueuedOperation): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(operation);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function removeFromStore(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearStore(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================================
// Operation Processors
// ============================================================================

type OperationProcessor = (operation: QueuedOperation) => Promise<void>;

const processors: Record<string, OperationProcessor> = {
  transfer: async (op) => {
    const response = await fetch('/api/vault/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op.data),
    });
    if (!response.ok) throw new Error('Transfer failed');
  },

  message: async (op) => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op.data),
    });
    if (!response.ok) throw new Error('Message failed');
  },

  vote: async (op) => {
    const response = await fetch('/api/governance/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op.data),
    });
    if (!response.ok) throw new Error('Vote failed');
  },

  stake: async (op) => {
    const response = await fetch('/api/staking/stake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op.data),
    });
    if (!response.ok) throw new Error('Stake failed');
  },

  custom: async (op) => {
    const { url, method = 'POST', body } = op.data as { url: string; method?: string; body?: unknown };
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error('Request failed');
  },
};

// ============================================================================
// Service Worker Registration
// ============================================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version available! Refresh to update.');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

// ============================================================================
// Offline Queue Hook
// ============================================================================

export function useOfflineQueue() {
  const [state, setState] = useState<OfflineQueueState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    queue: [],
    isSyncing: false,
    lastSyncTime: null,
  });

  // Load queue on mount
  useEffect(() => {
    getAllFromStore()
      .then((queue) => setState((s) => ({ ...s, queue })))
      .catch(console.error);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState((s) => ({ ...s, isOnline: true }));
      syncQueue();
    };

    const handleOffline = () => {
      setState((s) => ({ ...s, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'QUEUE_REQUEST') {
        const { request } = event.data;
        addOperation({
          type: 'custom',
          data: {
            url: request.url,
            method: request.method,
            body: request.body,
          },
        });
      } else if (event.data.type === 'PROCESS_QUEUE') {
        syncQueue();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const addOperation = useCallback(async (
    operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries' | 'maxRetries' | 'status'>
  ): Promise<string> => {
    const newOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending',
    };

    await addToStore(newOp);
    setState((s) => ({ ...s, queue: [...s.queue, newOp] }));

    // Try to process immediately if online
    if (navigator.onLine) {
      processOperation(newOp);
    }

    return newOp.id;
  }, []);

  const removeOperation = useCallback(async (id: string): Promise<void> => {
    await removeFromStore(id);
    setState((s) => ({ ...s, queue: s.queue.filter((op) => op.id !== id) }));
  }, []);

  const processOperation = async (operation: QueuedOperation): Promise<boolean> => {
    const processor = processors[operation.type];
    if (!processor) {
      console.error(`No processor for operation type: ${operation.type}`);
      return false;
    }

    try {
      // Update status to processing
      const processingOp = { ...operation, status: 'processing' as const };
      await updateInStore(processingOp);
      setState((s) => ({
        ...s,
        queue: s.queue.map((op) => (op.id === operation.id ? processingOp : op)),
      }));

      await processor(operation);

      // Success - remove from queue
      await removeFromStore(operation.id);
      setState((s) => ({
        ...s,
        queue: s.queue.filter((op) => op.id !== operation.id),
      }));

      return true;
    } catch (error) {
      // Failed - update retry count
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedOp: QueuedOperation = {
        ...operation,
        retries: operation.retries + 1,
        status: operation.retries + 1 >= operation.maxRetries ? 'failed' : 'pending',
        error: errorMessage,
      };

      await updateInStore(failedOp);
      setState((s) => ({
        ...s,
        queue: s.queue.map((op) => (op.id === operation.id ? failedOp : op)),
      }));

      return false;
    }
  };

  const syncQueue = useCallback(async (): Promise<void> => {
    if (!navigator.onLine || state.isSyncing) return;

    setState((s) => ({ ...s, isSyncing: true }));

    const pendingOps = state.queue.filter((op) => op.status === 'pending');
    
    for (const op of pendingOps) {
      await processOperation(op);
      // Small delay between operations
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setState((s) => ({
      ...s,
      isSyncing: false,
      lastSyncTime: Date.now(),
    }));
  }, [state.queue, state.isSyncing]);

  const retryFailed = useCallback(async (): Promise<void> => {
    const failedOps = state.queue.filter((op) => op.status === 'failed');
    
    for (const op of failedOps) {
      // Reset retry count
      const resetOp = { ...op, retries: 0, status: 'pending' as const, error: undefined };
      await updateInStore(resetOp);
      setState((s) => ({
        ...s,
        queue: s.queue.map((o) => (o.id === op.id ? resetOp : o)),
      }));
    }

    await syncQueue();
  }, [state.queue, syncQueue]);

  const clearQueue = useCallback(async (): Promise<void> => {
    await clearStore();
    setState((s) => ({ ...s, queue: [] }));
  }, []);

  return {
    ...state,
    pendingCount: state.queue.filter((op) => op.status === 'pending').length,
    failedCount: state.queue.filter((op) => op.status === 'failed').length,
    addOperation,
    removeOperation,
    syncQueue,
    retryFailed,
    clearQueue,
  };
}

export default useOfflineQueue;
