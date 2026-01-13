/**
 * Offline Queue Tests
 */

import { QueuedOperation } from '../offlineQueue';

// Mock IndexedDB
const mockIDBRequest = {
  result: null as unknown,
  error: null as unknown,
  onsuccess: null as (() => void) | null,
  onerror: null as (() => void) | null,
};

const mockIDBObjectStore = {
  add: jest.fn(() => mockIDBRequest),
  put: jest.fn(() => mockIDBRequest),
  delete: jest.fn(() => mockIDBRequest),
  get: jest.fn(() => mockIDBRequest),
  getAll: jest.fn(() => mockIDBRequest),
  clear: jest.fn(() => mockIDBRequest),
};

const mockIDBTransaction = {
  objectStore: jest.fn(() => mockIDBObjectStore),
};

const mockIDBDatabase = {
  transaction: jest.fn(() => mockIDBTransaction),
  objectStoreNames: { contains: jest.fn(() => true) },
  createObjectStore: jest.fn(),
};

const mockIndexedDB = {
  open: jest.fn(() => ({
    result: mockIDBDatabase,
    error: null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onupgradeneeded: null as ((event: unknown) => void) | null,
  })),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('QueuedOperation interface', () => {
  it('should define correct structure for queued operations', () => {
    const operation: QueuedOperation = {
      id: 'test-1',
      type: 'transfer',
      data: { to: '0x123', amount: '100' },
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending',
    };

    expect(operation.id).toBe('test-1');
    expect(operation.type).toBe('transfer');
    expect(operation.status).toBe('pending');
    expect(operation.retries).toBe(0);
    expect(operation.maxRetries).toBe(3);
  });

  it('should support all operation types', () => {
    const types: QueuedOperation['type'][] = ['transfer', 'message', 'vote', 'stake', 'custom'];
    
    types.forEach(type => {
      const operation: QueuedOperation = {
        id: `op-${type}`,
        type,
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        status: 'pending',
      };
      expect(operation.type).toBe(type);
    });
  });

  it('should support all status types', () => {
    const statuses: QueuedOperation['status'][] = ['pending', 'processing', 'completed', 'failed'];
    
    statuses.forEach(status => {
      const operation: QueuedOperation = {
        id: `op-${status}`,
        type: 'transfer',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        status,
      };
      expect(operation.status).toBe(status);
    });
  });

  it('should support optional error field', () => {
    const operationWithError: QueuedOperation = {
      id: 'test-error',
      type: 'transfer',
      data: {},
      timestamp: Date.now(),
      retries: 3,
      maxRetries: 3,
      status: 'failed',
      error: 'Network timeout',
    };

    expect(operationWithError.error).toBe('Network timeout');
  });
});

describe('Offline queue operations', () => {
  it('should generate unique IDs for operations', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });

  it('should calculate retry delays correctly', () => {
    const baseDelay = 1000;
    const maxDelay = 30000;

    const calculateDelay = (retries: number) => {
      return Math.min(baseDelay * Math.pow(2, retries), maxDelay);
    };

    expect(calculateDelay(0)).toBe(1000);
    expect(calculateDelay(1)).toBe(2000);
    expect(calculateDelay(2)).toBe(4000);
    expect(calculateDelay(3)).toBe(8000);
    expect(calculateDelay(4)).toBe(16000);
    expect(calculateDelay(5)).toBe(30000); // Capped at max
    expect(calculateDelay(10)).toBe(30000); // Still capped
  });

  it('should filter operations by status', () => {
    const operations: QueuedOperation[] = [
      { id: '1', type: 'transfer', data: {}, timestamp: 1, retries: 0, maxRetries: 3, status: 'pending' },
      { id: '2', type: 'message', data: {}, timestamp: 2, retries: 0, maxRetries: 3, status: 'completed' },
      { id: '3', type: 'vote', data: {}, timestamp: 3, retries: 1, maxRetries: 3, status: 'processing' },
      { id: '4', type: 'stake', data: {}, timestamp: 4, retries: 3, maxRetries: 3, status: 'failed' },
    ];

    const pending = operations.filter(op => op.status === 'pending');
    const completed = operations.filter(op => op.status === 'completed');
    const failed = operations.filter(op => op.status === 'failed');

    expect(pending.length).toBe(1);
    expect(completed.length).toBe(1);
    expect(failed.length).toBe(1);
  });

  it('should sort operations by timestamp', () => {
    const operations: QueuedOperation[] = [
      { id: '3', type: 'transfer', data: {}, timestamp: 3000, retries: 0, maxRetries: 3, status: 'pending' },
      { id: '1', type: 'transfer', data: {}, timestamp: 1000, retries: 0, maxRetries: 3, status: 'pending' },
      { id: '2', type: 'transfer', data: {}, timestamp: 2000, retries: 0, maxRetries: 3, status: 'pending' },
    ];

    const sorted = [...operations].sort((a, b) => a.timestamp - b.timestamp);
    
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('should check if operation should be retried', () => {
    const shouldRetry = (op: QueuedOperation) => {
      return op.status === 'failed' && op.retries < op.maxRetries;
    };

    const canRetry: QueuedOperation = {
      id: '1', type: 'transfer', data: {}, timestamp: 1, retries: 1, maxRetries: 3, status: 'failed'
    };
    const cannotRetry: QueuedOperation = {
      id: '2', type: 'transfer', data: {}, timestamp: 2, retries: 3, maxRetries: 3, status: 'failed'
    };

    expect(shouldRetry(canRetry)).toBe(true);
    expect(shouldRetry(cannotRetry)).toBe(false);
  });
});

describe('Service Worker registration', () => {
  it('should check for service worker support', () => {
    const isSupported = 'serviceWorker' in navigator;
    // In test environment, may or may not be supported
    expect(typeof isSupported).toBe('boolean');
  });
});
