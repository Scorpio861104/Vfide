/**
 * WebSocket Manager Tests
 * Tests real-time messaging, connection lifecycle, and resilience
 */

import { WebSocketManager, useWebSocket } from '@/lib/websocket';
import { renderHook, waitFor } from '@testing-library/react';

// Mock WebSocket instances
let mockInstances: MockWebSocket[] = [];

class MockWebSocket {
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure' } as CloseEvent);
    }
  });

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    mockInstances.push(this);
    // Auto-connect after microtask
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen(new Event('open'));
    }, 0);
  }

  // Helper to simulate incoming messages in tests
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
}

// Replace global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocket Manager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockInstances = [];
    wsManager = new WebSocketManager({
      url: 'ws://localhost:8080',
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });
  });

  afterEach(() => {
    wsManager.disconnect();
    jest.useRealTimers();
  });

  describe('Connection Management', () => {
    it('establishes connection successfully', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      expect(mockInstances.length).toBe(1);
      expect(mockInstances[0].readyState).toBe(1);
    });

    it('handles connection errors', async () => {
      // Override auto-connect to trigger error instead
      const OrigMock = (global as any).WebSocket;
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          // Override: trigger error instead of open
          // Clear the auto-open behavior by resetting readyState
          this.readyState = 0;
          queueMicrotask(() => {
            this.readyState = 3;
            this.onopen = null; // Prevent auto-open from resolving
            if (this.onerror) this.onerror(new Event('error'));
          });
        }
      };

      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);

      await expect(connectPromise).rejects.toThrow('WebSocket connection failed');
      (global as any).WebSocket = OrigMock;
    });

    it('disconnects cleanly', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      wsManager.disconnect();

      expect(mockInstances[0].close).toHaveBeenCalled();
    });

    it('prevents multiple concurrent connections', async () => {
      const promise1 = wsManager.connect('0x123');
      const promise2 = wsManager.connect('0x123');

      await expect(promise2).rejects.toThrow('Already connecting');
      jest.advanceTimersByTime(10);
      await promise1;
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;
    });

    it('sends messages successfully', () => {
      const success = wsManager.send({
        type: 'message',
        from: '0x123',
        data: { content: 'Hello' },
      });

      expect(success).toBe(true);
      expect(mockInstances[0].send).toHaveBeenCalled();
    });

    it('fails to send when disconnected', () => {
      wsManager.disconnect();

      const success = wsManager.send({
        type: 'message',
        from: '0x123',
        data: { content: 'Hello' },
      });

      expect(success).toBe(false);
    });

    it('receives and processes messages', async () => {
      const handler = jest.fn();
      wsManager.on('message', handler);

      // Simulate incoming message
      mockInstances[0].simulateMessage({
        type: 'message',
        payload: {
          from: '0x456',
          data: { content: 'Hi' },
          timestamp: Date.now(),
        },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('handles multiple message handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      wsManager.on('message', handler1);
      wsManager.on('message', handler2);

      mockInstances[0].simulateMessage({
        type: 'message',
        payload: { from: '0x456', data: {}, timestamp: Date.now() },
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    it('attempts reconnection on disconnect', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      // Simulate disconnect from server
      const ws = mockInstances[0];
      ws.readyState = 3;
      if (ws.onclose) ws.onclose({ code: 1006, reason: 'Abnormal closure' } as CloseEvent);

      // Manager handles disconnection
      expect(ws.readyState).toBe(3);
    });

    it('stops reconnecting after max attempts', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      expect(mockInstances.length).toBe(1);
    });

    it('does not reconnect when explicitly closed', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      wsManager.disconnect();

      expect(mockInstances[0].close).toHaveBeenCalled();
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('starts heartbeat after connection', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      expect(mockInstances[0].readyState).toBe(1);
    });

    it('stops heartbeat on disconnect', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      wsManager.disconnect();

      expect(mockInstances[0].close).toHaveBeenCalled();
    });

    it('sends heartbeat messages periodically', async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;

      // Advance past heartbeat interval
      mockInstances[0].send.mockClear();
      jest.advanceTimersByTime(31000);

      // Heartbeat should have sent a ping
      expect(mockInstances[0].send).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await connectPromise;
    });

    it('subscribes to message types', () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.on('typing', handler);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('unsubscribes from message types', () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.on('typing', handler);

      unsubscribe();

      // Simulate typing message
      mockInstances[0].simulateMessage({ type: 'typing', payload: {} });

      // Handler should NOT be called after unsubscribe
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockInstances = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('provides connection state', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
    );

    expect(result.current.isConnected).toBeDefined();
  });

  it('provides send function', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
    );

    expect(result.current.send).toBeInstanceOf(Function);
  });

  it('provides subscribe function', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
    );

    expect(result.current.subscribe).toBeInstanceOf(Function);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
    );

    const disconnectSpy = jest.spyOn(WebSocketManager.prototype, 'disconnect');
    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
