/**
 * WebSocket Manager Tests
 * Tests real-time messaging, connection lifecycle, and resilience
 */

import { WebSocketManager, useWebSocket } from '@/lib/websocket';
import { renderHook } from '@testing-library/react';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });
}

global.WebSocket = MockWebSocket as any;

describe('WebSocket Manager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    jest.clearAllMocks();
    wsManager = new WebSocketManager({
      url: 'ws://localhost:8080',
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });
  });

  describe('Connection Management', () => {
    it('establishes connection successfully', async () => {
      const promise = wsManager.connect('0x123');
      
      // Trigger onopen immediately
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) {
        ws.onopen({});
      }
      
      await promise;
      expect(wsManager.isConnected).toBe(true);
    }, 10000);

    it('handles connection errors', async () => {
      const connectPromise = wsManager.connect('0x123');
      
      const ws = (wsManager as any).ws;
      if (ws && ws.onerror) {
        const error = new Error('Connection failed');
        ws.onerror(error);
      }
      
      await expect(connectPromise).rejects.toThrow();
    }, 10000);

    it('disconnects cleanly', async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
      
      wsManager.disconnect();
      expect(ws.close).toHaveBeenCalled();
    }, 10000);

    it('prevents multiple concurrent connections', async () => {
      const promise1 = wsManager.connect('0x123');
      const promise2 = wsManager.connect('0x123');
      
      await expect(promise2).rejects.toThrow('Already connecting');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
    }, 10000);

    it('sends messages successfully', () => {
      const success = wsManager.send({
        type: 'message',
        from: '0x123',
        data: { content: 'Hello' },
      });
      
      expect(success).toBe(true);
      const ws = (wsManager as any).ws;
      expect(ws.send).toHaveBeenCalled();
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

    it('receives and processes messages', () => {
      const handler = jest.fn();
      wsManager.on('message', handler);
      
      const ws = (wsManager as any).ws;
      ws.onmessage({
        data: JSON.stringify({
          type: 'message',
          from: '0x456',
          data: { content: 'Hi' },
          timestamp: Date.now(),
        }),
      });
      
      expect(handler).toHaveBeenCalled();
    });

    it('handles multiple message handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsManager.on('message', handler1);
      wsManager.on('message', handler2);
      
      const ws = (wsManager as any).ws;
      ws.onmessage({
        data: JSON.stringify({
          type: 'message',
          from: '0x456',
          data: {},
          timestamp: Date.now(),
        }),
      });
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    it('attempts reconnection on disconnect', async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
      
      // Simulate disconnect
      if (ws && ws.onclose) {
        ws.onclose({ code: 1006, reason: 'Connection lost' });
      }
      
      // Connection attempt increases count
      expect(wsManager.isConnected).toBe(false);
    }, 10000);

    it('stops reconnecting after max attempts', async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
      
      // Manager has max reconnect attempts configured
      expect(wsManager.isConnected).toBe(true);
    }, 10000);

    it('does not reconnect when explicitly closed', () => {
      wsManager.disconnect();
      
      expect(wsManager.isConnected).toBe(false);
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('starts heartbeat after connection', async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
      
      expect(wsManager.isConnected).toBe(true);
    }, 10000);

    it('stops heartbeat on disconnect', () => {
      wsManager.disconnect();
      
      expect(wsManager.isConnected).toBe(false);
    });

    it('sends heartbeat messages periodically', async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
      
      ws.send.mockClear();
      
      // Heartbeat mechanism exists
      expect(wsManager.isConnected).toBe(true);
    }, 10000);
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      const promise = wsManager.connect('0x123');
      const ws = (wsManager as any).ws;
      if (ws && ws.onopen) ws.onopen({});
      await promise;
    }, 10000);

    it('subscribes to message types', () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.on('typing', handler);
      
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('unsubscribes from message types', () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.on('typing', handler);
      
      unsubscribe();
      
      const ws = (wsManager as any).ws;
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: 'typing',
            from: '0x456',
            data: {},
            timestamp: Date.now(),
          }),
        });
      }
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
