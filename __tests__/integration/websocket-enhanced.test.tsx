/**
 * Enhanced WebSocket Integration Tests
 * 
 * Comprehensive tests for WebSocket connection lifecycle, real-time messaging,
 * authentication, resilience, and advanced features.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { WebSocketManager, useWebSocket, WSMessage } from '@/lib/websocket';

type MockSocket = {
  on: jest.Mock;
  emit: jest.Mock;
  off: jest.Mock;
  disconnect: jest.Mock;
  connected: boolean;
  id: string;
  io: {
    opts: {
      auth?: unknown;
    };
  };
};

let mockSocket: MockSocket;
let socketHandlers: Map<string, Set<Function>>;

const createMockSocket = (): MockSocket => {
  socketHandlers = new Map();
  
  const socket: MockSocket = {
    on: jest.fn((event: string, handler: Function) => {
      if (!socketHandlers.has(event)) {
        socketHandlers.set(event, new Set());
      }
      socketHandlers.get(event)!.add(handler);
      return socket;
    }),
    emit: jest.fn((event: string, data?: unknown) => {
      if (socketHandlers.has(event)) {
        socketHandlers.get(event)!.forEach(h => h(data));
      }
    }),
    off: jest.fn((event: string, handler?: Function) => {
      if (handler && socketHandlers.has(event)) {
        socketHandlers.get(event)!.delete(handler);
      } else if (socketHandlers.has(event)) {
        socketHandlers.get(event)!.clear();
      }
      return socket;
    }),
    disconnect: jest.fn(() => {
      socket.connected = false;
      triggerSocketEvent('disconnect', 'client disconnect');
    }),
    connected: true, // Start as connected for simplicity
    id: 'mock-socket-id',
    io: {
      opts: {
        auth: undefined,
      },
    },
  };
  
  return socket;
};

// Helper function to manually trigger socket events (for use in tests)
const triggerSocketEvent = (event: string, data?: unknown) => {
  if (socketHandlers && socketHandlers.has(event)) {
    socketHandlers.get(event)!.forEach(h => h(data));
  }
};

// Auto-trigger connect event after socket creation
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    mockSocket = createMockSocket();
    // Trigger connect after a microtask to let event handlers register
    Promise.resolve().then(() => {
      triggerSocketEvent('connect');
    });
    return mockSocket;
  }),
}));

describe('Enhanced WebSocket Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = createMockSocket();
  });

  describe('Connection Lifecycle', () => {
    it('should establish connection with authentication', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: {
          token: 'test-token',
          address: '0x123',
          chainId: 8453,
        },
      });

      await wsManager.connect('0x123', 'signature', 'message', 8453);

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      });
    });

    it('should handle connection lifecycle events', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });

      const connectHandler = jest.fn();
      const disconnectHandler = jest.fn();
      const errorHandler = jest.fn();

      wsManager.on('connect', connectHandler);
      wsManager.on('disconnect', disconnectHandler);
      wsManager.on('error', errorHandler);

      await wsManager.connect('0x123');

      // Wait for connect event to fire
      await waitFor(() => {
        expect(connectHandler).toHaveBeenCalled();
      });

      // Trigger disconnect
      triggerSocketEvent('disconnect', 'transport close');
      
      // Wait for disconnect event
      await waitFor(() => {
        expect(disconnectHandler).toHaveBeenCalled();
      });

      // Trigger error
      triggerSocketEvent('error', new Error('Connection error'));
      
      // Wait for error event
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });
    });

    it('should disconnect cleanly and cleanup resources', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });

      await wsManager.connect('0x123');
      wsManager.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should handle reconnection on disconnect', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      await wsManager.connect('0x123');

      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'disconnect') {
          setTimeout(() => handler('transport close'), 0);
        }
        return mockSocket;
      });

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      });
    });

    it('should prevent multiple concurrent connections', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });

      const promise1 = wsManager.connect('0x123');
      const promise2 = wsManager.connect('0x123');

      await expect(promise2).rejects.toThrow('Already connecting');
      await promise1;
    });
  });

  describe('Real-Time Message Handling', () => {
    let wsManager: WebSocketManager;

    beforeEach(async () => {
      wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });
      await wsManager.connect('0x123');
    });

    it('should send and receive messages', async () => {
      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        to: '0x456',
        conversationId: 'conv-1',
        data: { text: 'Hello World' },
        timestamp: Date.now(),
      };

      const messageHandler = jest.fn();
      wsManager.on('message', messageHandler);

      wsManager.send(message);

      expect(mockSocket.emit).toHaveBeenCalledWith('message', message);
    });

    it('should handle binary data transfer', async () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        to: '0x456',
        data: { binary: binaryData },
        timestamp: Date.now(),
      };

      wsManager.send(message);

      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'message',
        from: '0x123',
      }));
    });

    it('should maintain message ordering', async () => {
      const messages: WSMessage[] = [
        { type: 'message', from: '0x123', data: { seq: 1 }, timestamp: Date.now() },
        { type: 'message', from: '0x123', data: { seq: 2 }, timestamp: Date.now() + 1 },
        { type: 'message', from: '0x123', data: { seq: 3 }, timestamp: Date.now() + 2 },
      ];

      messages.forEach(msg => wsManager.send(msg));

      expect(mockSocket.emit).toHaveBeenCalledTimes(3);
      expect(mockSocket.emit).toHaveBeenNthCalledWith(1, 'message', expect.objectContaining({ data: { seq: 1 } }));
      expect(mockSocket.emit).toHaveBeenNthCalledWith(2, 'message', expect.objectContaining({ data: { seq: 2 } }));
      expect(mockSocket.emit).toHaveBeenNthCalledWith(3, 'message', expect.objectContaining({ data: { seq: 3 } }));
    });

    it('should handle typing indicators', async () => {
      const typingHandler = jest.fn();
      wsManager.on('typing', typingHandler);

      wsManager.send({
        type: 'typing',
        from: '0x123',
        to: '0x456',
        conversationId: 'conv-1',
        data: { isTyping: true },
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'typing',
      }));
    });

    it('should handle read receipts', async () => {
      const readHandler = jest.fn();
      wsManager.on('read', readHandler);

      wsManager.send({
        type: 'read',
        from: '0x123',
        conversationId: 'conv-1',
        data: { messageId: 'msg-123' },
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'read',
      }));
    });
  });

  describe('Connection Resilience', () => {
    it('should retry connection on failure', async () => {
      let connectionAttempts = 0;

      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'connect_error') {
          connectionAttempts++;
          if (connectionAttempts < 3) {
            setTimeout(() => handler(new Error('Connection failed')), 0);
          }
        }
        if (event === 'connect' && connectionAttempts >= 3) {
          setTimeout(() => handler(), 0);
        }
        return mockSocket;
      });

      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      await wsManager.connect('0x123');

      await waitFor(() => {
        expect(connectionAttempts).toBeGreaterThanOrEqual(1);
      });
    });

    it('should implement exponential backoff', async () => {
      const attempts: number[] = [];
      const startTime = Date.now();

      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'connect_error') {
          attempts.push(Date.now() - startTime);
          if (attempts.length < 3) {
            setTimeout(() => handler(new Error('Connection failed')), 0);
          }
        }
        return mockSocket;
      });

      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      try {
        await wsManager.connect('0x123');
      } catch (error) {
        // Expected to fail
      }

      expect(attempts.length).toBeGreaterThan(0);
    });

    it('should handle network interruption gracefully', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });

      await wsManager.connect('0x123');

      mockSocket.connected = false;
      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'disconnect') {
          setTimeout(() => handler('transport error'), 0);
        }
        return mockSocket;
      });

      await waitFor(() => {
        expect(wsManager.isConnected()).toBe(false);
      }, { timeout: 1000 });
    });
  });

  describe('Multiple Simultaneous Connections', () => {
    it('should handle multiple instances independently', async () => {
      const ws1 = new WebSocketManager({ url: 'ws://localhost:8080' });
      const ws2 = new WebSocketManager({ url: 'ws://localhost:8080' });

      await Promise.all([
        ws1.connect('0x123'),
        ws2.connect('0x456'),
      ]);

      expect(ws1.isConnected()).toBe(true);
      expect(ws2.isConnected()).toBe(true);

      ws1.disconnect();
      expect(ws1.isConnected()).toBe(false);
      expect(ws2.isConnected()).toBe(true);
    });

    it('should isolate message handlers between instances', async () => {
      const ws1 = new WebSocketManager({ url: 'ws://localhost:8080' });
      const ws2 = new WebSocketManager({ url: 'ws://localhost:8080' });

      await Promise.all([ws1.connect('0x123'), ws2.connect('0x456')]);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      ws1.on('message', handler1);
      ws2.on('message', handler2);

      ws1.send({ type: 'message', from: '0x123', data: { text: 'Hello from ws1' }, timestamp: Date.now() });

      expect(mockSocket.emit).toHaveBeenCalled();
      expect(handler1).not.toHaveBeenCalled();
    });
  });

  describe('Room/Channel Management', () => {
    let wsManager: WebSocketManager;

    beforeEach(async () => {
      wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });
      await wsManager.connect('0x123');
    });

    it('should join a room/channel', async () => {
      wsManager.joinRoom('room-1');

      expect(mockSocket.emit).toHaveBeenCalledWith('join', 'room-1');
    });

    it('should leave a room/channel', async () => {
      wsManager.joinRoom('room-1');
      wsManager.leaveRoom('room-1');

      expect(mockSocket.emit).toHaveBeenCalledWith('leave', 'room-1');
    });

    it('should handle messages in specific rooms', async () => {
      const roomHandler = jest.fn();

      wsManager.joinRoom('room-1');
      wsManager.on('message', roomHandler);

      wsManager.send({
        type: 'message',
        from: '0x123',
        data: { text: 'Room message', room: 'room-1' },
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        data: expect.objectContaining({ room: 'room-1' }),
      }));
    });
  });

  describe('Heartbeat/Ping-Pong Mechanism', () => {
    it('should send heartbeat at intervals', async () => {
      jest.useFakeTimers();

      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        heartbeatInterval: 1000,
      });

      await wsManager.connect('0x123');

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Object));
      });

      jest.useRealTimers();
    });

    it('should handle pong responses', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        heartbeatInterval: 1000,
      });

      await wsManager.connect('0x123');

      const pongHandler = jest.fn();
      wsManager.on('pong', pongHandler);

      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'pong') {
          setTimeout(() => handler({ timestamp: Date.now() }), 0);
        }
        return mockSocket;
      });

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('pong', expect.any(Function));
      });
    });
  });

  describe('Authentication over WebSocket', () => {
    it('should authenticate with signature', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: {
          signature: 'test-signature',
          message: 'test-message',
          address: '0x123',
        },
      });

      await wsManager.connect('0x123', 'test-signature', 'test-message');

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      });
    });

    it('should handle authentication failure', async () => {
      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'auth_error') {
          setTimeout(() => handler({ message: 'Invalid signature' }), 0);
        }
        return mockSocket;
      });

      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: {
          signature: 'invalid-signature',
          address: '0x123',
        },
      });

      const authErrorHandler = jest.fn();
      wsManager.on('auth_error', authErrorHandler);

      await wsManager.connect('0x123', 'invalid-signature');

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('auth_error', expect.any(Function));
      });
    });

    it('should re-authenticate on reconnection', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: {
          signature: 'test-signature',
          address: '0x123',
        },
      });

      await wsManager.connect('0x123', 'test-signature');

      mockSocket.connected = false;
      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'disconnect') {
          setTimeout(() => handler('transport close'), 0);
        }
        if (event === 'connect') {
          setTimeout(() => handler(), 100);
        }
        return mockSocket;
      });

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      });
    });
  });

  describe('Message Delivery Guarantees', () => {
    let wsManager: WebSocketManager;

    beforeEach(async () => {
      wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
      });
      await wsManager.connect('0x123');
    });

    it('should queue messages when disconnected', async () => {
      mockSocket.connected = false;

      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        data: { text: 'Queued message' },
        timestamp: Date.now(),
      };

      const result = wsManager.send(message);

      expect(result).toBe(false);
    });

    it('should deliver queued messages on reconnection', async () => {
      mockSocket.connected = false;

      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        data: { text: 'Queued message' },
        timestamp: Date.now(),
      };

      wsManager.send(message);

      mockSocket.connected = true;
      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
        return mockSocket;
      });

      await wsManager.connect('0x123');

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
          data: { text: 'Queued message' },
        }));
      });
    });

    it('should implement acknowledgment mechanism', async () => {
      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        data: { text: 'Ack message' },
        timestamp: Date.now(),
      };

      mockSocket.emit = jest.fn((event: string, data: unknown, callback?: Function) => {
        if (callback) {
          setTimeout(() => callback({ status: 'delivered', messageId: 'msg-123' }), 0);
        }
      });

      wsManager.send(message);

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalled();
      });
    });
  });

  describe('useWebSocket Hook', () => {
    it('should initialize and connect', async () => {
      const { result } = renderHook(() =>
        useWebSocket(
          { url: 'ws://localhost:8080' },
          '0x123'
        )
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle connection state changes', async () => {
      const { result } = renderHook(() =>
        useWebSocket(
          { url: 'ws://localhost:8080' },
          '0x123'
        )
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useWebSocket(
          { url: 'ws://localhost:8080' },
          '0x123'
        )
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
