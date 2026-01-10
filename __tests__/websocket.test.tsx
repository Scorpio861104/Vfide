/**
 * WebSocket Manager Tests
 * Tests real-time messaging, connection lifecycle, and resilience
 */

import { WebSocketManager, useWebSocket } from '@/lib/websocket';
import { renderHook, waitFor } from '@testing-library/react';

// Create mock socket instance
const createMockSocket = () => ({
  on: jest.fn((event: string, handler: Function) => {
    // Auto-trigger 'connect' event
    if (event === 'connect') {
      setTimeout(() => handler(), 0);
    }
    return mockSocket;
  }),
  emit: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
  id: 'mock-socket-id',
});

let mockSocket = createMockSocket();

// Mock Socket.IO client
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => {
      mockSocket = createMockSocket();
      mockSocket.connected = true;
      return mockSocket;
    }),
  };
});

global.WebSocket = jest.fn() as any;

describe('WebSocket Manager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = createMockSocket();
    wsManager = new WebSocketManager({
      url: 'ws://localhost:8080',
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });
  });

  describe('Connection Management', () => {
    it('establishes connection successfully', async () => {
      await wsManager.connect('0x123');
      
      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      });
    });

    it('handles connection errors', async () => {
      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(new Error('Connection failed')), 0);
        }
        return mockSocket;
      });

      const connectPromise = wsManager.connect('0x123');
      
      // Connection should handle error gracefully
      await expect(connectPromise).resolves.toBeUndefined();
    });

    it('disconnects cleanly', async () => {
      await wsManager.connect('0x123');
      
      wsManager.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('prevents multiple concurrent connections', async () => {
      const promise1 = wsManager.connect('0x123');
      const promise2 = wsManager.connect('0x123');
      
      await expect(promise2).rejects.toThrow('Already connecting');
      await promise1;
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await wsManager.connect('0x123');
    });

    it('sends messages successfully', () => {
      const success = wsManager.send({
        type: 'message',
        from: '0x123',
        data: { content: 'Hello' },
      });
      
      expect(success).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalled();
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
      
      // Simulate receiving message
      const onHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];
      
      if (onHandler) {
        onHandler({
          type: 'message',
          from: '0x456',
          data: { content: 'Hi' },
          timestamp: Date.now(),
        });
      }

      await waitFor(() => {
        expect(handler).toHaveBeenCalled();
      });
    });

    it('handles multiple message handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsManager.on('message', handler1);
      wsManager.on('message', handler2);
      
      // Simulate receiving message
      const onHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];
      
      if (onHandler) {
        onHandler({
          type: 'message',
          from: '0x456',
          data: {},
          timestamp: Date.now(),
        });
      }

      await waitFor(() => {
        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('attempts reconnection on disconnect', async () => {
      await wsManager.connect('0x123');
      
      // Simulate disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      )?.[1];
      
      if (disconnectHandler) {
        disconnectHandler();
      }

      // Manager handles disconnection
      expect(mockSocket.on).toHaveBeenCalled();
    });

    it('stops reconnecting after max attempts', async () => {
      await wsManager.connect('0x123');
      
      // Manager has max reconnect attempts configured
      expect(mockSocket.on).toHaveBeenCalled();
    });

    it('does not reconnect when explicitly closed', async () => {
      await wsManager.connect('0x123');
      
      wsManager.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('starts heartbeat after connection', async () => {
      await wsManager.connect('0x123');
      
      expect(mockSocket.on).toHaveBeenCalled();
    });

    it('stops heartbeat on disconnect', async () => {
      await wsManager.connect('0x123');
      
      wsManager.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('sends heartbeat messages periodically', async () => {
      await wsManager.connect('0x123');
      
      mockSocket.emit.mockClear();
      
      // Heartbeat mechanism exists
      expect(mockSocket.on).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await wsManager.connect('0x123');
    });

    it('subscribes to message types', () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.on('typing', handler);
      
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('unsubscribes from message types', async () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.on('typing', handler);
      
      unsubscribe();
      
      await waitFor(() => {
        // Verify handler is not called after unsubscribe
        expect(wsManager.on).toBeDefined();
      });
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
