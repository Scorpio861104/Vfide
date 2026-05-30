/**
 * Service Worker for Push Notifications
 * 
 * Handles push notifications, background sync, and caching.
 */

 
/* global self, clients */

const CACHE_NAME = 'vfide-v1';
const RUNTIME_CACHE = 'vfide-runtime';

// Files to cache on install (static assets only - NOT HTML pages)
// For a DeFi app with dynamic content, HTML should always be fetched fresh from network
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ============================================================================
// Service Worker Lifecycle
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// ============================================================================
// Fetch Handler (Network First with Cache Fallback)
// ============================================================================

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension')) {
    return;
  }

  // F-FE-018 FIX: Determine whether this request is safe to cache.
  // The previous implementation cached EVERY successful GET indiscriminately
  // — including authenticated /api/* responses such as /api/notifications,
  // /api/crypto/balance, and /api/users/[address] — into the shared
  // RUNTIME_CACHE under the SW scope of '/'. On a shared device this leaked
  // one user's authenticated payloads to the next user after logout, since
  // the SW retained them. This guard keeps SW caching for static assets
  // while bypassing it for any request that:
  //   1. targets the /api/ namespace (any authenticated or user-specific data)
  //   2. carries an Authorization header (bearer tokens of any kind)
  //   3. is destined for a same-origin path that the app marks as no-store
  //      (we can only check the request side here, so the response-side
  //       Cache-Control check below is a defense-in-depth)
  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch {
    return; // unparseable URL — let the browser handle natively
  }
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isApiPath = isSameOrigin && requestUrl.pathname.startsWith('/api/');
  const hasAuthHeader = event.request.headers && event.request.headers.has('authorization');
  if (isApiPath || hasAuthHeader) {
    return; // let the browser handle these — never write to RUNTIME_CACHE
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);

        // Cache successful responses, but respect Cache-Control directives so
        // upstream "no-store"/"private" responses are never persisted in the
        // SW cache even if a new code path forgets to opt out above.
        if (networkResponse.ok) {
          const cacheControl = networkResponse.headers.get('cache-control') || '';
          const cacheControlLower = cacheControl.toLowerCase();
          const disallowsCache =
            cacheControlLower.includes('no-store') ||
            cacheControlLower.includes('private') ||
            cacheControlLower.includes('no-cache');
          if (!disallowsCache) {
            cache.put(event.request, networkResponse.clone());
          }
        }

        return networkResponse;
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // No cache, return offline page or error
        throw error;
      }
    })
  );
});

// ============================================================================
// Push Notification Handler
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notification = {
    title: 'VFIDE',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        ...notification,
        ...data,
      };
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notification.body = event.data.text() || notification.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      image: notification.image,
      data: notification.data,
      tag: notification.tag || 'default',
      requireInteraction: notification.requireInteraction || false,
      vibrate: [200, 100, 200],
      actions: notification.actions || [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' },
      ],
    })
  );
});

// ============================================================================
// Notification Click Handler
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Handle action clicks
  if (event.action === 'close') {
    return;
  }

  // F-FE-008 FIX: validate notification URL before opening. Without this, a
  // compromised push payload (server breach OR a stolen push subscription
  // replayed by the attacker through the legit push provider) can drive every
  // affected user's browser to attacker-controlled URLs the moment they click
  // a notification. Same-origin only; reject any cross-origin or non-http(s).
  function safeUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || rawUrl.length === 0) return '/';
    // Allow same-origin relative paths starting with single slash
    if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) return rawUrl;
    try {
      const parsed = new URL(rawUrl, self.registration.scope);
      const scopeOrigin = new URL(self.registration.scope).origin;
      if (parsed.origin !== scopeOrigin) return '/';
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '/';
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_e) {
      return '/';
    }
  }

  const urlToOpen = safeUrl(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if no matching window found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================================================
// Notification Close Handler
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  // F-FE-021 FIX: removed call to /api/analytics/track. The endpoint does not
  // exist in this codebase (only /api/analytics/portfolio is registered) and
  // the previous fetch produced a 404 every time a user dismissed a push
  // notification. We retain the data on the notification but no longer fire
  // the request. If a tracking endpoint is added later, this listener can
  // re-issue the POST.
  void event;
});

// ============================================================================
// Background Sync Handler
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    // Get pending messages from IndexedDB or cache
    const cache = await caches.open('pending-messages');
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync messages:', error);
  }
}

// ============================================================================
// Message Handler (for postMessage communication)
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    // F-FE-019 FIX: validate that the message originates from a same-origin
    // window controlled by this SW. Without this check any cross-origin frame
    // (or compromised script the user navigated to in a separate tab that
    // happens to hold a reference to a previously-fetched ServiceWorker
    // registration) could have caused the SW to fetch and cache arbitrary
    // attacker-controlled URLs under the application's origin.
    const source = event.source;
    if (!source || typeof source.url !== 'string') {
      return;
    }
    let sourceOrigin;
    try {
      sourceOrigin = new URL(source.url).origin;
    } catch {
      return;
    }
    if (sourceOrigin !== self.location.origin) {
      return;
    }
    // Only accept arrays of strings, and reject any URL that resolves to a
    // different origin or to the /api/ namespace (which carries authenticated
    // data and must never be pre-warmed by an arbitrary caller).
    const requestedUrls = Array.isArray(event.data.urls) ? event.data.urls : [];
    const safeUrls = [];
    for (const candidate of requestedUrls) {
      if (typeof candidate !== 'string') continue;
      let resolved;
      try {
        resolved = new URL(candidate, self.location.origin);
      } catch {
        continue;
      }
      if (resolved.origin !== self.location.origin) continue;
      if (resolved.pathname.startsWith('/api/')) continue;
      safeUrls.push(resolved.href);
    }
    if (safeUrls.length === 0) {
      return;
    }
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(safeUrls);
      })
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

console.log('Service Worker loaded');
