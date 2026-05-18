/**
 * Offline Queue — Stores transactions when offline, syncs when back online
 * 
 * Uses IndexedDB for persistence across page reloads.
 * Service worker not required — this works with the online/offline events API.
 * 
 * Flow:
 * 1. Merchant creates charge (amount + description)
 * 2. If online → normal flow (generate QR, wait for payment)
 * 3. If offline → queue the charge, show "queued" status
 * 4. When back online → sync queued charges to backend
 */

const DB_NAME = 'vfide-pos-offline';
const STORE_NAME = 'pending-charges';
const DB_VERSION = 1;

export interface PendingCharge {
  id: string;
  amount: string;
  description: string;
  currency: string;
  createdAt: number;
  status: 'queued' | 'syncing' | 'synced' | 'failed';
  merchantAddress: string;
  errorMessage?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueCharge(charge: PendingCharge): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(charge);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCharges(): Promise<PendingCharge[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateChargeStatus(id: string, status: PendingCharge['status'], errorMessage?: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const get = store.get(id);
    get.onsuccess = () => {
      if (get.result) {
        store.put({ ...get.result, status, errorMessage });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeCharge(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPendingCharges(merchantAddress: string): Promise<{ synced: number; failed: number }> {
  const charges = await getPendingCharges();
  const queued = charges.filter(c => c.status === 'queued' && c.merchantAddress === merchantAddress);
  let synced = 0;
  let failed = 0;

  for (const charge of queued) {
    try {
      await updateChargeStatus(charge.id, 'syncing');
      const res = await fetch('/api/pos/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: charge.amount,
          description: charge.description,
          currency: charge.currency,
          merchantAddress: charge.merchantAddress,
          offlineId: charge.id,
          createdAt: charge.createdAt,
        }),
      });

      if (res.ok) {
        await updateChargeStatus(charge.id, 'synced');
        synced++;
      } else {
        const data = await res.json().catch(() => ({}));
        await updateChargeStatus(charge.id, 'failed', (data as { error?: string }).error || `HTTP ${res.status}`);
        failed++;
      }
    } catch (err) {
      await updateChargeStatus(charge.id, 'failed', err instanceof Error ? err.message : 'Network error');
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Listen for online events and auto-sync.
 * Call this once on POS page mount.
 */
export function setupAutoSync(merchantAddress: string, onSync?: (result: { synced: number; failed: number }) => void) {
  const handler = async () => {
    const result = await syncPendingCharges(merchantAddress);
    onSync?.(result);
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
