/**
 * Service Worker for Push Notifications
 * 
 * Handles push notifications, background sync, and caching.
 */

 
/* global self, clients */

const CACHE_NAME = 'vfide-v1';
const RUNTIME_CACHE = 'vfide-runtime';
const CSRF_HEADER_NAME = 'x-csrf-token';

let cachedCsrfToken = null;
let csrfTokenPromise = null;

const isWriteMethod = (method) => {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
};

const isSameOrigin = (url) => {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin;
  } catch {
    return false;
  }
};

const getCsrfToken = async () => {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch('/api/csrf', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return '';
        const data = await response.json();
        return typeof data?.token === 'string' ? data.token : '';
      })
      .then((token) => {
        cachedCsrfToken = token || null;
        csrfTokenPromise = null;
        return token;
      })
      .catch(() => {
        csrfTokenPromise = null;
        return '';
      });
  }
  return csrfTokenPromise;
};

const fetchWithCsrf = async (input, init) => {
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const url = typeof input === 'string' ? input : input.url;

  if (isWriteMethod(method) && isSameOrigin(url)) {
    const token = await getCsrfToken();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));

    if (token && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, token);
    }

    const nextInit = {
      ...init,
      headers,
      credentials: init?.credentials || 'include',
    };

    if (input instanceof Request) {
      return fetch(new Request(input, nextInit));
    }

    return fetch(input, nextInit);
  }

  return fetch(input, init);
};

// Files to cache on install
const STATIC_ASSETS = [
  '/',
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

  // Never cache API responses — they contain dynamic/authenticated data
  if (new URL(event.request.url).pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
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

  // Get URL from notification data
  const urlToOpen = event.notification.data?.url || '/';

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
  
  // Track notification dismissal
  const notificationData = event.notification.data;
  if (notificationData?.trackDismissal) {
    // Send analytics event
    fetchWithCsrf('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'notification_dismissed',
        data: notificationData,
      }),
    }).catch((error) => {
      console.error('Failed to track notification dismissal:', error);
    });
  }
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
        await fetchWithCsrf(request);
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
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
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
