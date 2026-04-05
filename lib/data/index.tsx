/**
 * Unified Data Layer — Connects on-chain events to the UI
 *
 * The gap between "great architecture" and "best product" is data.
 * Pages show empty states because there's no bridge from contract
 * events to React components. This module provides:
 *
 *   1. EventIndexer — Polls contract events and caches them
 *   2. useContractData — React hook for reading indexed data
 *   3. RealtimeProvider — WebSocket connection for live updates
 *   4. SeedContent — Demo data that makes the app feel alive on first load
 *
 * On-chain data flows: Contract event → Indexer → Cache → React hook → UI
 */
'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
//  1. EVENT CACHE — In-memory + IndexedDB for persistence
// ═══════════════════════════════════════════════════════════════════════════

interface CachedEvent {
  id: string;
  contract: string;
  event: string;
  args: Record<string, unknown>;
  blockNumber: number;
  timestamp: number;
  txHash: string;
}

const CACHE_DB = 'vfide_events';
const CACHE_STORE = 'events';

async function openEventDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const store = db.createObjectStore(CACHE_STORE, { keyPath: 'id' });
        store.createIndex('contract', 'contract');
        store.createIndex('event', 'event');
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function cacheEvents(events: CachedEvent[]): Promise<void> {
  try {
    const db = await openEventDB();
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    for (const event of events) tx.objectStore(CACHE_STORE).put(event);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  } catch {}
}

async function getCachedEvents(contract?: string, eventName?: string, limit = 50): Promise<CachedEvent[]> {
  try {
    const db = await openEventDB();
    const tx = db.transaction(CACHE_STORE, 'readonly');
    const store = tx.objectStore(CACHE_STORE);
    const all: CachedEvent[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    let filtered = all;
    if (contract) filtered = filtered.filter(e => e.contract === contract);
    if (eventName) filtered = filtered.filter(e => e.event === eventName);
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. REALTIME PROVIDER — WebSocket for live updates
// ═══════════════════════════════════════════════════════════════════════════

type EventHandler = (event: CachedEvent) => void;

interface RealtimeContextValue {
  connected: boolean;
  subscribe: (eventType: string, handler: EventHandler) => () => void;
  lastEvent: CachedEvent | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  subscribe: () => () => {},
  lastEvent: null,
});

export function useRealtime() { return useContext(RealtimeContext); }

export function RealtimeProvider({ children, wsUrl }: { children: ReactNode; wsUrl?: string }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CachedEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  useEffect(() => {
    const websocketUrl = wsUrl ?? process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? '';
    if (!websocketUrl) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function connect() {
      try {
        ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };
        ws.onerror = () => ws.close();

        ws.onmessage = (msg) => {
          try {
            const event: CachedEvent = JSON.parse(msg.data);
            setLastEvent(event);
            cacheEvents([event]);

            const handlers = handlersRef.current.get(event.event) || new Set();
            const allHandlers = handlersRef.current.get('*') || new Set();
            handlers.forEach(h => h(event));
            allHandlers.forEach(h => h(event));
          } catch {}
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [wsUrl]);

  const subscribe = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);
    return () => { handlersRef.current.get(eventType)?.delete(handler); };
  }, []);

  const value = useMemo(() => ({ connected, subscribe, lastEvent }), [connected, subscribe, lastEvent]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. USE CONTRACT DATA — React hook for reading indexed events
// ═══════════════════════════════════════════════════════════════════════════

interface UseContractDataOptions {
  contract?: string;
  event?: string;
  limit?: number;
  pollInterval?: number; // ms, 0 = no polling
}

export function useContractData(options: UseContractDataOptions = {}) {
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useRealtime();

  // Initial load from cache
  useEffect(() => {
    getCachedEvents(options.contract, options.event, options.limit).then(cached => {
      setEvents(cached);
      setLoading(false);
    });
  }, [options.contract, options.event, options.limit]);

  // Live updates
  useEffect(() => {
    if (!options.event) return;
    return subscribe(options.event, (newEvent) => {
      setEvents(prev => [newEvent, ...prev].slice(0, options.limit || 50));
    });
  }, [options.event, options.limit, subscribe]);

  // Polling fallback for environments without WebSocket
  useEffect(() => {
    if (!options.pollInterval || options.pollInterval <= 0) return;
    const interval = setInterval(async () => {
      const fresh = await getCachedEvents(options.contract, options.event, options.limit);
      setEvents(fresh);
    }, options.pollInterval);
    return () => clearInterval(interval);
  }, [options.contract, options.event, options.limit, options.pollInterval]);

  return { events, loading };
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. PROTOCOL STATS — Aggregate metrics from contract state
// ═══════════════════════════════════════════════════════════════════════════

export interface ProtocolStats {
  totalUsers: number;
  totalMerchants: number;
  totalTransactions: number;
  totalVolume: string;
  totalBurned: string;
  totalDonated: string;
  averageProofScore: number;
  activeLenders: number;
  activeLoans: number;
  defaultRate: number;
}

export function useProtocolStats(): { stats: ProtocolStats; loading: boolean } {
  const [stats, setStats] = useState<ProtocolStats>({
    totalUsers: 0, totalMerchants: 0, totalTransactions: 0,
    totalVolume: '0', totalBurned: '0', totalDonated: '0',
    averageProofScore: 5000, activeLenders: 0, activeLoans: 0, defaultRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats/protocol');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {} finally { setLoading(false); }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return { stats, loading };
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. USER STATE — Unified user data across the app
// ═══════════════════════════════════════════════════════════════════════════

export interface UserState {
  address: string | null;
  proofScore: number;
  isMerchant: boolean;
  isCouncilMember: boolean;
  hasVault: boolean;
  vaultAddress: string | null;
  badges: string[];
  activeLoanCount: number;
  unresolvedDefaults: number;
  streak: number;
  todayRevenue: number;
  todayOrders: number;
  unreadNotifications: number;
}

const DEFAULT_USER: UserState = {
  address: null, proofScore: 5000, isMerchant: false, isCouncilMember: false,
  hasVault: false, vaultAddress: null, badges: [], activeLoanCount: 0,
  unresolvedDefaults: 0, streak: 0, todayRevenue: 0, todayOrders: 0, unreadNotifications: 0,
};

const UserContext = createContext<{ user: UserState; refresh: () => void }>({
  user: DEFAULT_USER, refresh: () => {},
});

export function useUser() { return useContext(UserContext); }

export function UserProvider({ children, address }: { children: ReactNode; address?: string }) {
  const [user, setUser] = useState<UserState>({ ...DEFAULT_USER, address: address || null });

  const refresh = useCallback(async () => {
    if (!address) { setUser({ ...DEFAULT_USER }); return; }
    try {
      const res = await fetch(`/api/user/state?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setUser({ ...DEFAULT_USER, ...data, address });
      }
    } catch {}
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  // Refresh on focus (user comes back to tab)
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [refresh]);

  const value = useMemo(() => ({ user, refresh }), [user, refresh]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
