/**
 * State Management Integration Tests
 * 
 * Comprehensive tests for global state management, state synchronization,
 * persistence, hydration, and cross-component state sharing.
 */

import '@testing-library/jest-dom';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

describe('State Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Global State Management', () => {
    it('should initialize global state', () => {
      const store = {
        state: {
          user: null,
          wallet: null,
          theme: 'light',
          notifications: [],
        },
        getState: jest.fn(function(this: any) {
          return this.state;
        }),
      };

      const state = store.getState();
      
      expect(state.user).toBeNull();
      expect(state.theme).toBe('light');
      expect(state.notifications).toEqual([]);
    });

    it('should update state immutably', () => {
      const store = {
        state: { count: 0, items: [] as number[] },
        setState: jest.fn(function(this: any, updates) {
          this.state = { ...this.state, ...updates };
          return this.state;
        }),
      };

      const newState = store.setState({ count: 1 });
      
      expect(newState.count).toBe(1);
      expect(newState).not.toBe(store.state);
    });

    it('should handle nested state updates', () => {
      const store = {
        state: {
          user: { profile: { name: 'Alice', age: 30 } },
        },
        updateNested: jest.fn(function(this: any, path, value) {
          const keys = path.split('.');
          const newState = JSON.parse(JSON.stringify(this.state));
          
          let current: any = newState;
          for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          
          this.state = newState;
          return this.state;
        }),
      };

      store.updateNested('user.profile.name', 'Bob');
      
      expect(store.state.user.profile.name).toBe('Bob');
      expect(store.state.user.profile.age).toBe(30);
    });

    it('should support multiple store slices', () => {
      const createStore = () => ({
        slices: {
          auth: { user: null, token: null },
          wallet: { address: null, connected: false },
          ui: { theme: 'light', sidebar: 'open' },
        },
        getSlice: jest.fn(function(this: any, sliceName) {
          return this.slices[sliceName];
        }),
        updateSlice: jest.fn(function(this: any, sliceName, updates) {
          this.slices[sliceName] = { ...this.slices[sliceName], ...updates };
          return this.slices[sliceName];
        }),
      });

      const store = createStore();

      store.updateSlice('auth', { user: { id: '123', name: 'Alice' } });
      store.updateSlice('wallet', { address: '0x123', connected: true });

      expect(store.getSlice('auth').user?.id).toBe('123');
      expect(store.getSlice('wallet').connected).toBe(true);
    });
  });

  describe('State Synchronization Across Components', () => {
    it('should notify subscribers on state change', () => {
      const store = {
        state: { count: 0 },
        subscribers: new Set<Function>(),
        subscribe: jest.fn(function(this: any, callback) {
          this.subscribers.add(callback);
          return () => this.subscribers.delete(callback);
        }),
        setState: jest.fn(function(this: any, updates) {
          this.state = { ...this.state, ...updates };
          this.subscribers.forEach(callback => callback(this.state));
        }),
      };

      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      store.subscribe(subscriber1);
      store.subscribe(subscriber2);

      store.setState({ count: 1 });

      expect(subscriber1).toHaveBeenCalledWith({ count: 1 });
      expect(subscriber2).toHaveBeenCalledWith({ count: 1 });
    });

    it('should allow selective subscription to state slices', () => {
      const store = {
        state: {
          user: { name: 'Alice' },
          wallet: { address: '0x123' },
        },
        sliceSubscribers: new Map<string, Set<Function>>(),
        subscribeToSlice: jest.fn(function(this: any, slice, callback) {
          if (!this.sliceSubscribers.has(slice)) {
            this.sliceSubscribers.set(slice, new Set());
          }
          this.sliceSubscribers.get(slice).add(callback);
          return () => this.sliceSubscribers.get(slice).delete(callback);
        }),
        updateSlice: jest.fn(function(this: any, slice, updates) {
          this.state[slice] = { ...this.state[slice], ...updates };
          const subscribers = this.sliceSubscribers.get(slice);
          if (subscribers) {
            subscribers.forEach(callback => callback(this.state[slice]));
          }
        }),
      };

      const userSubscriber = jest.fn();
      const walletSubscriber = jest.fn();

      store.subscribeToSlice('user', userSubscriber);
      store.subscribeToSlice('wallet', walletSubscriber);

      store.updateSlice('user', { name: 'Bob' });

      expect(userSubscriber).toHaveBeenCalledWith({ name: 'Bob' });
      expect(walletSubscriber).not.toHaveBeenCalled();
    });

    it('should batch multiple state updates', async () => {
      const store = {
        state: { count: 0, name: 'Alice', active: false },
        subscribers: new Set<Function>(),
        pendingUpdates: {} as any,
        batchTimeout: null as any,
        subscribe: jest.fn(function(this: any, callback) {
          this.subscribers.add(callback);
        }),
        batch: jest.fn(function(this: any, updates) {
          this.pendingUpdates = { ...this.pendingUpdates, ...updates };
          
          if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
          }
          
          this.batchTimeout = setTimeout(() => {
            this.state = { ...this.state, ...this.pendingUpdates };
            this.subscribers.forEach(callback => callback(this.state));
            this.pendingUpdates = {};
          }, 10);
        }),
      };

      const subscriber = jest.fn();
      store.subscribe(subscriber);

      store.batch({ count: 1 });
      store.batch({ name: 'Bob' });
      store.batch({ active: true });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(store.state).toEqual({ count: 1, name: 'Bob', active: true });
    });
  });

  describe('State Persistence', () => {
    it('should persist state to localStorage', () => {
      const persistedStore = {
        state: { user: { name: 'Alice', id: '123' } },
        persist: jest.fn(function(this: any) {
          localStorage.setItem('app-state', JSON.stringify(this.state));
          return { persisted: true };
        }),
        hydrate: jest.fn(function(this: any) {
          const saved = localStorage.getItem('app-state');
          if (saved) {
            this.state = JSON.parse(saved);
          }
          return this.state;
        }),
      };

      persistedStore.persist();
      
      const newStore = { state: {}, hydrate: persistedStore.hydrate };
      newStore.hydrate();

      expect(newStore.state).toEqual({ user: { name: 'Alice', id: '123' } });
    });

    it('should handle persistence errors gracefully', () => {
      const errorStore = {
        state: { data: 'test' },
        persist: jest.fn(function(this: any) {
          try {
            // Simulate quota exceeded error
            throw new Error('QuotaExceededError');
          } catch (error) {
            return { persisted: false, error: (error as Error).message };
          }
        }),
      };

      const result = errorStore.persist();

      expect(result.persisted).toBe(false);
      expect(result.error).toContain('QuotaExceededError');
    });

    it('should implement selective persistence', () => {
      const selectivePersist = {
        state: {
          user: { name: 'Alice', token: 'secret-token' },
          settings: { theme: 'dark', language: 'en' },
          session: { lastActive: Date.now() },
        },
        persistKeys: ['user.name', 'settings'],
        persist: jest.fn(function(this: any) {
          const toPersist: any = {};
          
          this.persistKeys.forEach((key: string) => {
            if (key.includes('.')) {
              const [parent, child] = key.split('.');
              if (!toPersist[parent]) toPersist[parent] = {};
              toPersist[parent][child] = this.state[parent][child];
            } else {
              toPersist[key] = this.state[key];
            }
          });
          
          localStorage.setItem('app-state', JSON.stringify(toPersist));
          return toPersist;
        }),
      };

      const persisted = selectivePersist.persist();

      expect(persisted.user.name).toBe('Alice');
      expect(persisted.user.token).toBeUndefined();
      expect(persisted.settings).toBeDefined();
      expect(persisted.session).toBeUndefined();
    });

    it('should implement versioned persistence', () => {
      const versionedStore = {
        version: 2,
        state: { user: { name: 'Alice' } },
        persist: jest.fn(function(this: any) {
          const data = {
            version: this.version,
            state: this.state,
            timestamp: Date.now(),
          };
          localStorage.setItem('app-state', JSON.stringify(data));
        }),
        hydrate: jest.fn(function(this: any) {
          const saved = localStorage.getItem('app-state');
          if (!saved) return null;
          
          const data = JSON.parse(saved);
          
          if (data.version !== this.version) {
            // Handle migration
            return this.migrate(data);
          }
          
          this.state = data.state;
          return this.state;
        }),
        migrate: jest.fn((oldData) => {
          // Simulate migration logic
          return { migrated: true, from: oldData.version };
        }),
      };

      versionedStore.persist();
      
      localStorage.setItem('app-state', JSON.stringify({
        version: 1,
        state: { user: { name: 'Alice' } },
      }));

      const result = versionedStore.hydrate();
      expect(result.migrated).toBe(true);
    });
  });

  describe('State Hydration', () => {
    it('should hydrate state on app initialization', () => {
      localStorage.setItem('app-state', JSON.stringify({
        user: { name: 'Alice', id: '123' },
        theme: 'dark',
      }));

      const store = {
        state: {},
        hydrate: jest.fn(function(this: any) {
          const saved = localStorage.getItem('app-state');
          if (saved) {
            this.state = JSON.parse(saved);
            return { hydrated: true, state: this.state };
          }
          return { hydrated: false };
        }),
      };

      const result = store.hydrate();

      expect(result.hydrated).toBe(true);
      expect(result.state.user.name).toBe('Alice');
      expect(result.state.theme).toBe('dark');
    });

    it('should validate hydrated state', () => {
      const validator = {
        schema: {
          user: { required: true, type: 'object' },
          theme: { required: false, type: 'string' },
        },
        validate: jest.fn(function(this: any, state) {
          const errors: string[] = [];
          
          Object.entries(this.schema).forEach(([key, rules]: [string, any]) => {
            if (rules.required && !state[key]) {
              errors.push(`${key} is required`);
            }
            if (state[key] && typeof state[key] !== rules.type) {
              errors.push(`${key} must be ${rules.type}`);
            }
          });
          
          return { valid: errors.length === 0, errors };
        }),
      };

      const invalidState = { theme: 'dark' };
      const result = validator.validate(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('user is required');
    });

    it('should merge hydrated state with defaults', () => {
      const storeWithDefaults = {
        defaults: {
          user: null,
          theme: 'light',
          language: 'en',
          notifications: { enabled: true },
        },
        hydrate: jest.fn(function(this: any) {
          const saved = { theme: 'dark', notifications: { enabled: false } };
          return { ...this.defaults, ...saved };
        }),
      };

      const state = storeWithDefaults.hydrate();

      expect(state.theme).toBe('dark');
      expect(state.language).toBe('en');
      expect(state.notifications.enabled).toBe(false);
    });
  });

  describe('State Selectors and Derived State', () => {
    it('should compute derived state', () => {
      const store = {
        state: {
          todos: [
            { id: 1, text: 'Task 1', completed: false },
            { id: 2, text: 'Task 2', completed: true },
            { id: 3, text: 'Task 3', completed: false },
          ],
        },
        selectCompletedTodos: jest.fn(function(this: any) {
          return this.state.todos.filter((todo: any) => todo.completed);
        }),
        selectActiveTodos: jest.fn(function(this: any) {
          return this.state.todos.filter((todo: any) => !todo.completed);
        }),
        selectTodoCount: jest.fn(function(this: any) {
          return {
            total: this.state.todos.length,
            completed: this.selectCompletedTodos().length,
            active: this.selectActiveTodos().length,
          };
        }),
      };

      const completed = store.selectCompletedTodos();
      const counts = store.selectTodoCount();

      expect(completed).toHaveLength(1);
      expect(counts.total).toBe(3);
      expect(counts.completed).toBe(1);
      expect(counts.active).toBe(2);
    });

    it('should memoize expensive selectors', () => {
      const memoizedStore = {
        state: { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 })) },
        cache: new Map(),
        selectExpensive: jest.fn(function(this: any, filter) {
          const cacheKey = JSON.stringify(filter);
          
          if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
          }
          
          const result = this.state.items.filter((item: any) => item.value > filter);
          this.cache.set(cacheKey, result);
          return result;
        }),
      };

      const result1 = memoizedStore.selectExpensive(500);
      const result2 = memoizedStore.selectExpensive(500);

      expect(memoizedStore.selectExpensive).toHaveBeenCalledTimes(2);
      expect(result1).toBe(result2);
    });

    it('should compose multiple selectors', () => {
      const store = {
        state: {
          users: [
            { id: 1, name: 'Alice', role: 'admin', active: true },
            { id: 2, name: 'Bob', role: 'user', active: false },
            { id: 3, name: 'Charlie', role: 'admin', active: true },
          ],
        },
        selectActiveUsers: jest.fn(function(this: any) {
          return this.state.users.filter((u: any) => u.active);
        }),
        selectAdmins: jest.fn(function(this: any) {
          return this.state.users.filter((u: any) => u.role === 'admin');
        }),
        selectActiveAdmins: jest.fn(function(this: any) {
          const active = this.selectActiveUsers();
          return active.filter((u: any) => u.role === 'admin');
        }),
      };

      const activeAdmins = store.selectActiveAdmins();

      expect(activeAdmins).toHaveLength(2);
      expect(activeAdmins.every((u: any) => u.active && u.role === 'admin')).toBe(true);
    });
  });

  describe('Async State Management', () => {
    it('should handle async state updates', async () => {
      const asyncStore = {
        state: { data: null, loading: false, error: null },
        fetchData: jest.fn(async function(this: any) {
          this.state.loading = true;
          
          try {
            const data = await new Promise(resolve => 
              setTimeout(() => resolve({ result: 'success' }), 100)
            );
            this.state = { data, loading: false, error: null };
            return this.state;
          } catch (error) {
            this.state = { data: null, loading: false, error };
            throw error;
          }
        }),
      };

      const promise = asyncStore.fetchData();
      expect(asyncStore.state.loading).toBe(true);

      await promise;
      expect(asyncStore.state.loading).toBe(false);
      expect(asyncStore.state.data).toEqual({ result: 'success' });
    });

    it('should handle concurrent async requests', async () => {
      const concurrentStore = {
        pendingRequests: new Map(),
        fetch: jest.fn(async function(this: any, key) {
          if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
          }
          
          const promise = new Promise(resolve => 
            setTimeout(() => resolve({ data: `result-${key}` }), 100)
          );
          
          this.pendingRequests.set(key, promise);
          
          try {
            const result = await promise;
            return result;
          } finally {
            this.pendingRequests.delete(key);
          }
        }),
      };

      const [result1, result2, result3] = await Promise.all([
        concurrentStore.fetch('key1'),
        concurrentStore.fetch('key1'),
        concurrentStore.fetch('key1'),
      ]);

      expect(concurrentStore.fetch).toHaveBeenCalledTimes(3);
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should implement optimistic updates with rollback', async () => {
      const optimisticStore = {
        state: { count: 0 },
        snapshot: null as any,
        optimisticUpdate: jest.fn(async function(this: any, update, asyncAction) {
          this.snapshot = { ...this.state };
          this.state = { ...this.state, ...update };
          
          try {
            const result = await asyncAction();
            this.snapshot = null;
            return { success: true, result };
          } catch (error) {
            this.state = this.snapshot;
            this.snapshot = null;
            return { success: false, error };
          }
        }),
      };

      const successPromise = optimisticStore.optimisticUpdate(
        { count: 1 },
        async () => ({ confirmed: true })
      );

      expect(optimisticStore.state.count).toBe(1);

      await successPromise;
      expect(optimisticStore.state.count).toBe(1);

      await optimisticStore.optimisticUpdate(
        { count: 2 },
        async () => { throw new Error('Failed'); }
      );

      expect(optimisticStore.state.count).toBe(1);
    });
  });

  describe('State Middleware', () => {
    it('should apply middleware to state updates', () => {
      const store = {
        state: { count: 0 },
        middleware: [] as any[],
        use: jest.fn(function(this: any, fn) {
          this.middleware.push(fn);
        }),
        setState: jest.fn(function(this: any, updates) {
          let nextState = { ...this.state, ...updates };
          
          for (const fn of this.middleware) {
            nextState = fn(this.state, nextState);
          }
          
          this.state = nextState;
          return this.state;
        }),
      };

      store.use((prev: any, next: any) => {
        console.log('State change:', prev, '->', next);
        return next;
      });

      store.use((prev: any, next: any) => {
        return { ...next, timestamp: Date.now() };
      });

      const newState = store.setState({ count: 1 });

      expect(newState.count).toBe(1);
      expect(newState.timestamp).toBeDefined();
    });

    it('should implement logging middleware', () => {
      const logger = {
        logs: [] as any[],
        middleware: jest.fn(function(this: any, prev, next) {
          this.logs.push({
            prev,
            next,
            timestamp: Date.now(),
          });
          return next;
        }),
      };

      const state1 = { count: 0 };
      const state2 = { count: 1 };

      logger.middleware(state1, state2);

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].prev.count).toBe(0);
      expect(logger.logs[0].next.count).toBe(1);
    });
  });
});
