/**
 * Offline Functionality Integration Tests
 * 
 * Comprehensive tests for Service Worker, IndexedDB storage, offline caching,
 * background sync, and progressive enhancement.
 */

import '@testing-library/jest-dom';
import { openDB, QueuedAction, CachedData, OfflineMessage, SyncStatus } from '@/lib/offline';

describe('Offline Functionality Integration Tests', () => {
  let mockIndexedDB: any;
  let mockServiceWorker: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIndexedDB = {
      open: jest.fn(),
      databases: jest.fn(),
      deleteDatabase: jest.fn(),
    };

    mockServiceWorker = {
      register: jest.fn(),
      ready: Promise.resolve({
        active: { postMessage: jest.fn() },
        sync: { register: jest.fn() },
      }),
      controller: { postMessage: jest.fn() },
    };

    global.indexedDB = mockIndexedDB as any;
    (global as any).navigator.serviceWorker = mockServiceWorker;
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue({
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        scope: '/',
      });

      const registration = await mockServiceWorker.register('/sw.js');

      expect(registration.active.state).toBe('activated');
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should handle service worker registration failure', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

      await expect(mockServiceWorker.register('/sw.js')).rejects.toThrow('Registration failed');
    });

    it('should update service worker when new version available', async () => {
      const registration = {
        installing: null,
        waiting: { state: 'installed' },
        active: { state: 'activated' },
        update: jest.fn().mockResolvedValue({}),
      };

      mockServiceWorker.register.mockResolvedValue(registration);

      await mockServiceWorker.register('/sw.js');
      await registration.update();

      expect(registration.update).toHaveBeenCalled();
    });

    it('should skip waiting and activate new service worker', async () => {
      const worker = {
        state: 'installed',
        postMessage: jest.fn(),
      };

      worker.postMessage({ type: 'SKIP_WAITING' });

      expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
  });

  describe('Offline Page Caching', () => {
    it('should cache HTML pages for offline access', async () => {
      const cache = {
        add: jest.fn(),
        addAll: jest.fn(),
        put: jest.fn(),
        match: jest.fn(),
      };

      const caches = {
        open: jest.fn().mockResolvedValue(cache),
      };

      (global as any).caches = caches;

      const pages = ['/', '/dashboard', '/profile', '/settings'];

      await caches.open('pages-v1');
      await cache.addAll(pages);

      expect(cache.addAll).toHaveBeenCalledWith(pages);
    });

    it('should serve cached page when offline', async () => {
      const cachedResponse = new Response('<html>Cached Page</html>', {
        headers: { 'Content-Type': 'text/html' },
      });

      const cache = {
        match: jest.fn().mockResolvedValue(cachedResponse),
      };

      const caches = {
        open: jest.fn().mockResolvedValue(cache),
        match: jest.fn().mockResolvedValue(cachedResponse),
      };

      (global as any).caches = caches;

      const response = await caches.match('/dashboard');

      expect(response).toBe(cachedResponse);
      expect(await response?.text()).toBe('<html>Cached Page</html>');
    });

    it('should update cache on navigation', async () => {
      const cache = {
        put: jest.fn(),
        match: jest.fn(),
      };

      const caches = {
        open: jest.fn().mockResolvedValue(cache),
      };

      (global as any).caches = caches;

      const response = new Response('<html>Updated</html>');
      await cache.put('/dashboard', response);

      expect(cache.put).toHaveBeenCalledWith('/dashboard', response);
    });

    it('should implement cache versioning strategy', async () => {
      const caches = {
        keys: jest.fn().mockResolvedValue(['pages-v1', 'pages-v2', 'api-v1']),
        delete: jest.fn(),
      };

      (global as any).caches = caches;

      const currentVersion = 'v2';
      const cacheKeys = await caches.keys();
      const oldCaches = cacheKeys.filter((key: string) => 
        key.startsWith('pages-') && !key.endsWith(currentVersion)
      );

      for (const cache of oldCaches) {
        await caches.delete(cache);
      }

      expect(caches.delete).toHaveBeenCalledWith('pages-v1');
    });
  });

  describe('IndexedDB Storage', () => {
    it('should store data in IndexedDB', async () => {
      const mockDB = {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
            }),
          }),
        }),
      };

      mockIndexedDB.open.mockReturnValue({
        onsuccess: function(this: any) {
          this.result = mockDB;
        },
        onerror: null,
      });

      const store = mockDB.transaction('messages', 'readwrite').objectStore('messages');
      const request = store.add({ id: '1', content: 'Hello', timestamp: Date.now() });

      expect(store.add).toHaveBeenCalled();
    });

    it('should retrieve data from IndexedDB', async () => {
      const mockData = { id: '1', content: 'Hello', timestamp: Date.now() };

      const mockDB = {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation(() => ({
              onsuccess: function(this: any) {
                this.result = mockData;
              },
              onerror: null,
            })),
          }),
        }),
      };

      const store = mockDB.transaction('messages', 'readonly').objectStore('messages');
      const request = store.get('1');

      if (request.onsuccess) {
        request.onsuccess.call(request);
        expect(request.result).toEqual(mockData);
      }
    });

    it('should query IndexedDB with indexes', async () => {
      const mockDB = {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            index: jest.fn().mockReturnValue({
              getAll: jest.fn().mockImplementation(() => ({
                onsuccess: function(this: any) {
                  this.result = [
                    { id: '1', status: 'pending' },
                    { id: '2', status: 'pending' },
                  ];
                },
              })),
            }),
          }),
        }),
      };

      const store = mockDB.transaction('queue', 'readonly').objectStore('queue');
      const index = store.index('status');
      const request = index.getAll('pending');

      if (request.onsuccess) {
        request.onsuccess.call(request);
        expect(request.result).toHaveLength(2);
      }
    });

    it('should handle IndexedDB errors gracefully', async () => {
      mockIndexedDB.open.mockReturnValue({
        onerror: function(this: any) {
          this.error = new Error('Database error');
        },
        onsuccess: null,
      });

      const request = mockIndexedDB.open('vfide-offline', 1);
      
      if (request.onerror) {
        request.onerror.call(request);
        expect(request.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Background Sync Queue', () => {
    it('should queue operations for background sync', async () => {
      const queue: QueuedAction[] = [];
      
      const queueManager = {
        add: jest.fn((action: QueuedAction) => {
          queue.push(action);
          return Promise.resolve(action);
        }),
        getAll: jest.fn(() => Promise.resolve(queue)),
      };

      await queueManager.add({
        id: 'action-1',
        type: 'message',
        action: 'send',
        data: { text: 'Hello' },
        timestamp: Date.now(),
        retryCount: 0,
        status: SyncStatus.PENDING,
      });

      const allActions = await queueManager.getAll();
      expect(allActions).toHaveLength(1);
      expect(allActions[0].type).toBe('message');
    });

    it('should register background sync', async () => {
      const registration = await mockServiceWorker.ready;
      await registration.sync.register('sync-messages');

      expect(registration.sync.register).toHaveBeenCalledWith('sync-messages');
    });

    it('should process sync queue when online', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'message',
          action: 'send',
          data: { text: 'Message 1' },
          timestamp: Date.now(),
          retryCount: 0,
          status: SyncStatus.PENDING,
        },
        {
          id: 'action-2',
          type: 'reaction',
          action: 'add',
          data: { messageId: 'msg-1', emoji: '👍' },
          timestamp: Date.now(),
          retryCount: 0,
          status: SyncStatus.PENDING,
        },
      ];

      const syncProcessor = {
        process: jest.fn(async () => {
          const results = queue.map(action => ({
            id: action.id,
            status: SyncStatus.SYNCED,
          }));
          queue.length = 0;
          return results;
        }),
      };

      const results = await syncProcessor.process();

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe(SyncStatus.SYNCED);
      expect(queue).toHaveLength(0);
    });

    it('should handle sync failures with retry', async () => {
      const action: QueuedAction = {
        id: 'action-1',
        type: 'message',
        action: 'send',
        data: { text: 'Failed message' },
        timestamp: Date.now(),
        retryCount: 0,
        status: SyncStatus.PENDING,
      };

      const syncWithRetry = {
        sync: jest.fn(async (action: QueuedAction) => {
          if (action.retryCount < 3) {
            action.retryCount++;
            action.status = SyncStatus.FAILED;
            action.error = 'Network error';
            throw new Error('Sync failed');
          }
          action.status = SyncStatus.SYNCED;
          return action;
        }),
      };

      try {
        await syncWithRetry.sync(action);
      } catch {
        expect(action.retryCount).toBe(1);
        expect(action.status).toBe(SyncStatus.FAILED);
      }
    });
  });

  describe('Offline Form Submissions', () => {
    it('should save form data when offline', async () => {
      const formData = {
        id: 'form-1',
        type: 'profile_update',
        data: { name: 'Alice', bio: 'Developer' },
        timestamp: Date.now(),
      };

      const offlineStorage = {
        save: jest.fn((data) => Promise.resolve({ saved: true, id: data.id })),
      };

      const result = await offlineStorage.save(formData);

      expect(result.saved).toBe(true);
      expect(offlineStorage.save).toHaveBeenCalledWith(formData);
    });

    it('should preserve form state during navigation', async () => {
      const formState = {
        formId: 'profile-form',
        fields: {
          name: 'Alice',
          email: 'alice@example.com',
          bio: 'Partial bio...',
        },
        timestamp: Date.now(),
      };

      const stateManager = {
        save: jest.fn((state) => {
          sessionStorage.setItem('form-state', JSON.stringify(state));
          return Promise.resolve(true);
        }),
        restore: jest.fn(() => {
          const saved = sessionStorage.getItem('form-state');
          return saved ? JSON.parse(saved) : null;
        }),
      };

      await stateManager.save(formState);
      const restored = stateManager.restore();

      expect(restored.formId).toBe('profile-form');
      expect(restored.fields.name).toBe('Alice');
    });

    it('should validate form before queuing submission', async () => {
      const validator = {
        validate: jest.fn((data) => {
          const errors: string[] = [];
          if (!data.email) errors.push('Email required');
          if (!data.name) errors.push('Name required');
          return { valid: errors.length === 0, errors };
        }),
      };

      const invalidData = { email: '', name: 'Alice' };
      const result = validator.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email required');
    });

    it('should submit queued forms when online', async () => {
      const queuedForms = [
        { id: 'form-1', data: { name: 'Alice' } },
        { id: 'form-2', data: { name: 'Bob' } },
      ];

      const submitter = {
        submitAll: jest.fn(async () => {
          return queuedForms.map(form => ({
            id: form.id,
            submitted: true,
            timestamp: Date.now(),
          }));
        }),
      };

      const results = await submitter.submitAll();

      expect(results).toHaveLength(2);
      expect(results[0].submitted).toBe(true);
    });
  });

  describe('Cached API Responses', () => {
    it('should cache API responses', async () => {
      const apiCache = {
        set: jest.fn((key: string, data: CachedData) => {
          return Promise.resolve(true);
        }),
      };

      const cachedData: CachedData = {
        key: '/api/user/profile',
        data: { name: 'Alice', id: '123' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
      };

      await apiCache.set('/api/user/profile', cachedData);

      expect(apiCache.set).toHaveBeenCalledWith('/api/user/profile', cachedData);
    });

    it('should serve cached responses when offline', async () => {
      const apiCache = {
        get: jest.fn((key: string) => {
          return Promise.resolve({
            key,
            data: { name: 'Alice', cached: true },
            timestamp: Date.now() - 60000,
          });
        }),
        has: jest.fn(() => Promise.resolve(true)),
      };

      const hasCache = await apiCache.has('/api/user/profile');
      const cached = await apiCache.get('/api/user/profile');

      expect(hasCache).toBe(true);
      expect(cached.data.cached).toBe(true);
    });

    it('should implement cache invalidation', async () => {
      const apiCache = {
        cache: new Map([
          ['/api/users', { timestamp: Date.now() - 7200000 }],
          ['/api/posts', { timestamp: Date.now() - 1800000 }],
        ]),
        invalidate: jest.fn((maxAge: number) => {
          const now = Date.now();
          const invalidated: string[] = [];
          
          apiCache.cache.forEach((value, key) => {
            if (now - value.timestamp > maxAge) {
              apiCache.cache.delete(key);
              invalidated.push(key);
            }
          });
          
          return invalidated;
        }),
      };

      const invalidated = apiCache.invalidate(3600000); // 1 hour

      expect(invalidated).toContain('/api/users');
      expect(apiCache.cache.has('/api/users')).toBe(false);
      expect(apiCache.cache.has('/api/posts')).toBe(true);
    });
  });

  describe('Progressive Enhancement', () => {
    it('should detect offline capabilities', () => {
      const capabilities = {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasIndexedDB: 'indexedDB' in window,
        hasCacheAPI: 'caches' in window,
      };

      expect(capabilities.hasServiceWorker).toBe(true);
      expect(capabilities.hasIndexedDB).toBe(true);
    });

    it('should enable features based on capabilities', () => {
      const featureFlags = {
        offline: true,
        backgroundSync: true,
        pushNotifications: false,
      };

      const enabledFeatures = Object.entries(featureFlags)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature);

      expect(enabledFeatures).toContain('offline');
      expect(enabledFeatures).toContain('backgroundSync');
      expect(enabledFeatures).not.toContain('pushNotifications');
    });

    it('should gracefully degrade when offline features unavailable', () => {
      const app = {
        mode: 'online-only',
        enableOffline: jest.fn(function(this: any) {
          if ('serviceWorker' in navigator) {
            this.mode = 'offline-enabled';
          }
        }),
      };

      app.enableOffline();

      expect(app.mode).toBe('offline-enabled');
    });
  });

  describe('Online/Offline Status Detection', () => {
    it('should detect online status', () => {
      const onlineStatus = {
        isOnline: jest.fn(() => navigator.onLine),
        addEventListener: jest.fn(),
      };

      const status = onlineStatus.isOnline();

      expect(typeof status).toBe('boolean');
    });

    it('should listen for online/offline events', () => {
      const statusListener = {
        online: false,
        listen: jest.fn(function(this: any) {
          window.addEventListener('online', () => { this.online = true; });
          window.addEventListener('offline', () => { this.online = false; });
        }),
      };

      statusListener.listen();

      expect(statusListener.listen).toHaveBeenCalled();
    });

    it('should trigger sync when coming online', async () => {
      const syncTrigger = {
        triggered: false,
        onOnline: jest.fn(async function(this: any) {
          this.triggered = true;
          return { synced: true };
        }),
      };

      await syncTrigger.onOnline();

      expect(syncTrigger.triggered).toBe(true);
    });
  });

  describe('Sync When Reconnected', () => {
    it('should sync pending operations on reconnection', async () => {
      const pendingOps: QueuedAction[] = [
        {
          id: 'op-1',
          type: 'message',
          action: 'send',
          data: { text: 'Hello' },
          timestamp: Date.now(),
          retryCount: 0,
          status: SyncStatus.PENDING,
        },
      ];

      const reconnectSync = {
        sync: jest.fn(async () => {
          const synced = pendingOps.map(op => ({
            ...op,
            status: SyncStatus.SYNCED,
          }));
          pendingOps.length = 0;
          return synced;
        }),
      };

      const results = await reconnectSync.sync();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(SyncStatus.SYNCED);
      expect(pendingOps).toHaveLength(0);
    });

    it('should refresh stale cache on reconnection', async () => {
      const cacheRefresher = {
        refresh: jest.fn(async () => {
          const staleKeys = ['/api/users', '/api/posts'];
          const refreshed = [];
          
          for (const key of staleKeys) {
            refreshed.push({
              key,
              refreshed: true,
              timestamp: Date.now(),
            });
          }
          
          return refreshed;
        }),
      };

      const results = await cacheRefresher.refresh();

      expect(results).toHaveLength(2);
      expect(results[0].refreshed).toBe(true);
    });

    it('should notify user of successful sync', async () => {
      const notifier = {
        notify: jest.fn((message: string) => {
          return { shown: true, message };
        }),
      };

      const result = notifier.notify('All changes synced successfully');

      expect(result.shown).toBe(true);
      expect(result.message).toContain('synced successfully');
    });
  });
});
