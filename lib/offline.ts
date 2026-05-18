/**
 * Offline Support System
 * 
 * IndexedDB storage, offline queue, and sync management for PWA capabilities.
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
}

export interface QueuedAction {
  id: string;
  type: 'message' | 'reaction' | 'profile_update' | 'group_action';
  action: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: SyncStatus;
  error?: string;
}

export interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export interface OfflineMessage {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  timestamp: number;
  status: SyncStatus;
  localOnly?: boolean;
}

// ============================================================================
// IndexedDB Setup
// ============================================================================

const DB_NAME = 'vfide-offline';
const DB_VERSION = 1;

const STORES = {
  QUEUE: 'sync-queue',
  CACHE: 'data-cache',
  MESSAGES: 'offline-messages',
  METADATA: 'metadata',
};

let dbInstance: IDBDatabase | null = null;

/**
 * Open IndexedDB connection
 */
export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
        messagesStore.createIndex('status', 'status', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Generic IndexedDB operation
 */
async function performDBOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Sync Queue Management
// ============================================================================

/**
 * Add action to sync queue
 */
export async function queueAction(
  type: QueuedAction['type'],
  action: string,
  data: Record<string, unknown>
): Promise<QueuedAction> {
  const queuedAction: QueuedAction = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    status: SyncStatus.PENDING,
  };

  await performDBOperation(STORES.QUEUE, 'readwrite', (store) =>
    store.add(queuedAction)
  );

  return queuedAction;
}

/**
 * Get all queued actions
 */
export async function getQueuedActions(
  status?: SyncStatus
): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.QUEUE);

    let request: IDBRequest;
    if (status) {
      const index = store.index('status');
      request = index.getAll(status);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update queued action status
 */
export async function updateQueuedAction(
  id: string,
  updates: Partial<QueuedAction>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.QUEUE);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        const updated = { ...action, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Action not found'));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Remove action from queue
 */
export async function removeQueuedAction(id: string): Promise<void> {
  await performDBOperation(STORES.QUEUE, 'readwrite', (store) =>
    store.delete(id)
  );
}

/**
 * Clear all synced actions
 */
export async function clearSyncedActions(): Promise<void> {
  const syncedActions = await getQueuedActions(SyncStatus.SYNCED);
  for (const action of syncedActions) {
    await removeQueuedAction(action.id);
  }
}

// ============================================================================
// Data Caching
// ============================================================================

/**
 * Cache data
 */
export async function cacheData(
  key: string,
  data: unknown,
  ttl?: number
): Promise<void> {
  const cached: CachedData = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: ttl ? Date.now() + ttl : undefined,
  };

  await performDBOperation(STORES.CACHE, 'readwrite', (store) =>
    store.put(cached)
  );
}

/**
 * Get cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const cached = await performDBOperation<CachedData<T>>(
    STORES.CACHE,
    'readonly',
    (store) => store.get(key)
  );

  if (!cached) return null;

  // Check expiration
  if (cached.expiresAt && cached.expiresAt < Date.now()) {
    await removeCachedData(key);
    return null;
  }

  return cached.data;
}

/**
 * Remove cached data
 */
export async function removeCachedData(key: string): Promise<void> {
  await performDBOperation(STORES.CACHE, 'readwrite', (store) =>
    store.delete(key)
  );
}

/**
 * Clear expired cache
 */
export async function clearExpiredCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const index = store.index('expiresAt');
    const request = index.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const cached = cursor.value as CachedData;
        if (cached.expiresAt && cached.expiresAt < Date.now()) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Offline Messages
// ============================================================================

/**
 * Save offline message
 */
export async function saveOfflineMessage(
  message: OfflineMessage
): Promise<void> {
  await performDBOperation(STORES.MESSAGES, 'readwrite', (store) =>
    store.put(message)
  );
}

/**
 * Get offline messages for conversation
 */
export async function getOfflineMessages(
  conversationId: string
): Promise<OfflineMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readonly');
    const store = transaction.objectStore(STORES.MESSAGES);
    const index = store.index('conversationId');
    const request = index.getAll(conversationId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update offline message status
 */
export async function updateOfflineMessage(
  id: string,
  updates: Partial<OfflineMessage>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const message = getRequest.result;
      if (message) {
        const updated = { ...message, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Message not found'));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Remove offline message
 */
export async function removeOfflineMessage(id: string): Promise<void> {
  await performDBOperation(STORES.MESSAGES, 'readwrite', (store) =>
    store.delete(id)
  );
}

// ============================================================================
// Network Status
// ============================================================================

/**
 * Check if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Wait for online status
 */
export function waitForOnline(): Promise<void> {
  if (isOnline()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener('online', handler);
      resolve();
    };
    window.addEventListener('online', handler);
  });
}

// ============================================================================
// Sync Management
// ============================================================================

/**
 * Sync pending actions
 */
export async function syncPendingActions(): Promise<{
  synced: number;
  failed: number;
}> {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  const pendingActions = await getQueuedActions(SyncStatus.PENDING);
  let synced = 0;
  let failed = 0;

  for (const action of pendingActions) {
    try {
      // Mark as syncing
      await updateQueuedAction(action.id, { status: SyncStatus.SYNCING });

      // Attempt to sync
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      if (response.ok) {
        await updateQueuedAction(action.id, { status: SyncStatus.SYNCED });
        synced++;
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      await updateQueuedAction(action.id, {
        status: SyncStatus.FAILED,
        retryCount: action.retryCount + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  // Clean up synced actions
  await clearSyncedActions();

  return { synced, failed };
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

/**
 * Hook to manage sync queue
 */
export function useSyncQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const online = useOnlineStatus();

  const loadQueue = useCallback(async () => {
    try {
      const actions = await getQueuedActions();
      setQueue(actions);
    } catch (error) {
      logger.error('Failed to load sync queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const sync = useCallback(async () => {
    if (!online || syncing) return;

    setSyncing(true);
    try {
      const result = await syncPendingActions();
      await loadQueue();
      return result;
    } catch (error) {
      logger.error('Sync failed:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [online, syncing, loadQueue]);

  const addToQueue = useCallback(
    async (
      type: QueuedAction['type'],
      action: string,
      data: Record<string, unknown>
    ) => {
      try {
        await queueAction(type, action, data);
        await loadQueue();
      } catch (error) {
        logger.error('Failed to queue action:', error);
        throw error;
      }
    },
    [loadQueue]
  );

  const retryFailed = useCallback(async () => {
    const failedActions = queue.filter(a => a.status === SyncStatus.FAILED);
    for (const action of failedActions) {
      await updateQueuedAction(action.id, {
        status: SyncStatus.PENDING,
        retryCount: 0,
      });
    }
    await loadQueue();
  }, [queue, loadQueue]);

  const clearQueue = useCallback(async () => {
    for (const action of queue) {
      await removeQueuedAction(action.id);
    }
    await loadQueue();
  }, [queue, loadQueue]);

  return {
    queue,
    syncing,
    loading,
    pendingCount: queue.filter(a => a.status === SyncStatus.PENDING).length,
    failedCount: queue.filter(a => a.status === SyncStatus.FAILED).length,
    sync,
    addToQueue,
    retryFailed,
    clearQueue,
    reload: loadQueue,
  };
}

/**
 * Hook for offline-first data fetching
 */
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const online = useOnlineStatus();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first
      const cached = await getCachedData<T>(key);
      if (cached) {
        setData(cached);
        setLoading(false);
      }

      // Fetch fresh data if online
      if (online) {
        const fresh = await fetcher();
        setData(fresh);
        await cacheData(key, fresh, ttl);
      } else if (!cached) {
        throw new Error('No cached data available offline');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, online]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload: loadData };
}
