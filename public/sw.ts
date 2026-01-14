/**
 * VFIDE Service Worker
 * 
 * Enables offline functionality:
 * - Cache static assets
 * - Queue transactions when offline
 * - Background sync when back online
 * - Push notifications
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'vfide-v1';
const _OFFLINE_QUEUE_KEY = 'vfide-offline-queue';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/vault',
  '/pay',
  '/offline',
  '/manifest.json',
];

// API routes that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/crypto/price',
  '/api/user/profile',
  '/api/tokens/balances',
];

// ============================================================================
// Install Event - Cache static assets
// ============================================================================

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// ============================================================================
// Activate Event - Clean old caches
// ============================================================================

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// ============================================================================
// Fetch Event - Network-first with cache fallback
// ============================================================================

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (except for specific API caching)
  if (event.request.method !== 'GET') {
    // Queue POST/PUT/DELETE requests if offline
    if (!navigator.onLine && url.pathname.startsWith('/api/')) {
      event.respondWith(queueRequest(event.request));
      return;
    }
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Static assets - Cache first, network fallback
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // Pages - Network first with offline fallback
  event.respondWith(networkFirstWithOfflineFallback(event.request));
});

// ============================================================================
// Caching Strategies
// ============================================================================

async function networkFirstStrategy(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    
    // Cache successful API responses
    if (response.ok && shouldCacheApiResponse(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch {
    // Offline - try cache
    const cached = await caches.match(request);
    if (cached) {
      // Add header to indicate stale data
      const headers = new Headers(cached.headers);
      headers.set('X-From-Cache', 'true');
      headers.set('X-Cache-Time', cached.headers.get('date') || 'unknown');
      
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        offline: true,
        message: 'This data is not available offline' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    
    // Cache the page
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch {
    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// ============================================================================
// Offline Queue for Transactions
// ============================================================================

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retries: number;
}

async function queueRequest(request: Request): Promise<Response> {
  const body = await request.text();
  
  const queuedRequest: QueuedRequest = {
    id: crypto.randomUUID(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: body || null,
    timestamp: Date.now(),
    retries: 0,
  };

  // Store in IndexedDB via client
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'QUEUE_REQUEST',
      request: queuedRequest,
    });
  });

  return new Response(
    JSON.stringify({
      queued: true,
      id: queuedRequest.id,
      message: 'Request queued for when you\'re back online',
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============================================================================
// Background Sync
// ============================================================================

// Type definition for SyncEvent
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'sync-queue') {
    syncEvent.waitUntil(processQueue());
  }
});

async function processQueue(): Promise<void> {
  // Get queued requests from clients
  const clients = await self.clients.matchAll();
  
  clients.forEach((client) => {
    client.postMessage({ type: 'PROCESS_QUEUE' });
  });
}

// ============================================================================
// Push Notifications
// ============================================================================

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: data.url || '/',
    },
    tag: data.tag || 'vfide-notification',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(async (clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          await client.focus();
          return;
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg')
  );
}

function shouldCacheApiResponse(url: string): boolean {
  const pathname = new URL(url).pathname;
  return CACHEABLE_API_ROUTES.some((route) => pathname.startsWith(route));
}

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      // Cache specific URLs on demand
      if (payload?.urls) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.addAll(payload.urls);
        });
      }
      break;

    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME);
      break;

    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.source?.postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
  }
});

async function getCacheSize(): Promise<number> {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  let totalSize = 0;
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}

export {};
