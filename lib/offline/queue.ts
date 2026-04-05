/**
 * OfflineQueue — Queue transactions when offline, sync when reconnected
 *
 * For market sellers with intermittent connectivity:
 *   1. User initiates a payment/action while offline
 *   2. Transaction is queued in IndexedDB
 *   3. When connectivity returns, queue processes automatically
 *   4. User gets notification of success/failure
 *
 * Uses IndexedDB for persistence (survives app restarts).
 * Background sync via Service Worker when available.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  type: 'payment' | 'order' | 'message' | 'endorsement' | 'post' | 'custom';
  payload: Record<string, unknown>;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  status: QueueItemStatus;
  retries: number;
  maxRetries: number;
  createdAt: number;
  lastAttempt: number | null;
  error: string | null;
  metadata?: { description?: string; amount?: number; recipient?: string };
}

const DB_NAME = 'vfide_offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

async function dbPut(item: QueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(): Promise<QueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetPending(): Promise<QueueItem[]> {
  const all = await dbGetAll();
  return all.filter(item => item.status === 'pending' || item.status === 'failed');
}

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueue(
  type: QueueItem['type'],
  endpoint: string,
  payload: Record<string, unknown>,
  options?: { method?: QueueItem['method']; maxRetries?: number; metadata?: QueueItem['metadata'] }
): Promise<string> {
  const id = generateId();
  const item: QueueItem = {
    id,
    type,
    payload,
    endpoint,
    method: options?.method || 'POST',
    status: 'pending',
    retries: 0,
    maxRetries: options?.maxRetries ?? 3,
    createdAt: Date.now(),
    lastAttempt: null,
    error: null,
    metadata: options?.metadata,
  };

  await dbPut(item);

  if (navigator.onLine) {
    processItem(item).catch(() => {});
  } else {
    try {
      const reg = await navigator.serviceWorker?.ready;
      const syncRegistration = reg as (ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }) | undefined;
      await syncRegistration?.sync?.register('sync-offline-queue');
    } catch {}
  }

  return id;
}

async function processItem(item: QueueItem): Promise<boolean> {
  try {
    item.status = 'processing';
    item.lastAttempt = Date.now();
    await dbPut(item);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token_client='))?.split('=')[1];
    if (csrfToken) headers['x-csrf-token'] = csrfToken;

    const response = await fetch(item.endpoint, {
      method: item.method,
      headers,
      credentials: 'include',
      body: JSON.stringify(item.payload),
    });

    if (response.ok) {
      item.status = 'completed';
      await dbPut(item);
      setTimeout(() => dbDelete(item.id), 86400000);
      return true;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    item.retries++;
    item.error = error instanceof Error ? error.message : 'Unknown error';
    item.status = item.retries >= item.maxRetries ? 'failed' : 'pending';
    await dbPut(item);
    return false;
  }
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const pending = await dbGetPending();
  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.retries >= item.maxRetries) {
      failed++;
      continue;
    }

    const success = await processItem(item);
    if (success) processed++;
    else failed++;

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { processed, failed };
}

export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const all = await dbGetAll();
  return {
    pending: all.filter(i => i.status === 'pending').length,
    processing: all.filter(i => i.status === 'processing').length,
    completed: all.filter(i => i.status === 'completed').length,
    failed: all.filter(i => i.status === 'failed').length,
    total: all.length,
  };
}

export async function retryFailed(): Promise<number> {
  const all = await dbGetAll();
  const failed = all.filter(i => i.status === 'failed');
  let retried = 0;

  for (const item of failed) {
    item.status = 'pending';
    item.retries = 0;
    item.error = null;
    await dbPut(item);
    retried++;
  }

  if (retried > 0 && navigator.onLine) {
    void processQueue();
  }

  return retried;
}

export async function clearCompleted(): Promise<number> {
  const all = await dbGetAll();
  const completed = all.filter(i => i.status === 'completed');

  for (const item of completed) {
    await dbDelete(item.id);
  }

  return completed.length;
}

export function useOfflineQueue() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [stats, setStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  const [items, setItems] = useState<QueueItem[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      if (!processingRef.current) {
        processingRef.current = true;
        await processQueue();
        processingRef.current = false;
        void refreshStats();
      }
    };

    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const nextStats = await getQueueStats();
      setStats(nextStats);
      const all = await dbGetAll();
      setItems(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch {}
  }, []);

  useEffect(() => {
    void refreshStats();
    const interval = setInterval(() => {
      void refreshStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshStats]);

  const add = useCallback(async (
    type: QueueItem['type'],
    endpoint: string,
    payload: Record<string, unknown>,
    options?: { method?: QueueItem['method']; metadata?: QueueItem['metadata'] }
  ) => {
    const id = await enqueue(type, endpoint, payload, options);
    void refreshStats();
    return id;
  }, [refreshStats]);

  return { online, stats, items, add, retry: retryFailed, clearCompleted, refresh: refreshStats };
}
