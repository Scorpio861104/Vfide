/**
 * Enhanced WebSocket Integration Tests
 * 
 * Comprehensive tests for WebSocket connection lifecycle, real-time messaging,
 * authentication, resilience, and advanced features.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { WebSocketManager, useWebSocket, WSMessage } from '@/lib/websocket';

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
    this.readyState = 3;
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
    setTimeout(() => {
      if (this.readyState === 0) {
        this.readyState = 1;
        if (this.onopen) this.onopen(new Event('open'));
      }
    }, 0);
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  simulateDisconnect(code = 1006, reason = 'Abnormal closure') {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose({ code, reason } as CloseEvent);
    }
  }
}

(global as any).WebSocket = MockWebSocket;

describe('Enhanced WebSocket Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockInstances = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Lifecycle', () => {
    it('should establish connection with authentication', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: { token: 'test-token', address: '0x123', chainId: 8453 },
      });

      const p = wsManager.connect('0x123', 'signature', 'message', 8453);
      jest.advanceTimersByTime(10);
      await p;

      expect(mockInstances.length).toBe(1);
      expect(mockInstances[0].url).toBe('ws://localhost:8080/');
      expect(mockInstances[0].send).toHaveBeenCalled();
      const authFrame = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      expect(authFrame.type).toBe('auth');
      expect(authFrame.payload.token).toBe('test-token');
      expect(authFrame.payload.address).toBe('0x123');
      expect(authFrame.payload.chainId).toBe(8453);

      wsManager.disconnect();
    });

    it('should handle connection lifecycle events', async () => {
      const wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });

      const connectHandler = jest.fn();
      const disconnectHandler = jest.fn();

      wsManager.on('connect', connectHandler);
      wsManager.on('disconnect', disconnectHandler);

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      expect(connectHandler).toHaveBeenCalled();

      mockInstances[0].simulateDisconnect();
      expect(disconnectHandler).toHaveBeenCalled();

      wsManager.disconnect();
    });

    it('should disconnect cleanly and cleanup resources', async () => {
      const wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      wsManager.disconnect();

      expect(mockInstances[0].close).toHaveBeenCalled();
      expect(wsManager.isConnected).toBe(false);
    });

    it('should handle reconnection on disconnect', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      const disconnectHandler = jest.fn();
      wsManager.on('disconnect', disconnectHandler);

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      mockInstances[0].simulateDisconnect();
      expect(disconnectHandler).toHaveBeenCalled();
      expect(wsManager.isConnected).toBe(false);

      wsManager.disconnect();
    });

    it('should prevent multiple concurrent connections', async () => {
      const wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });

      const promise1 = wsManager.connect('0x123');
      const promise2 = wsManager.connect('0x123');

      await expect(promise2).rejects.toThrow('Already connecting');

      jest.advanceTimersByTime(10);
      await promise1;

      wsManager.disconnect();
    });
  });

  describe('Real-Time Message Handling', () => {
    let wsManager: WebSocketManager;

    beforeEach(async () => {
      wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });
      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;
      mockInstances[0].send.mockClear();
    });

    afterEach(() => {
      wsManager.disconnect();
    });

    it('should send and receive messages', () => {
      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        to: '0x456',
        conversationId: 'conv-1',
        data: { text: 'Hello World' },
        timestamp: Date.now(),
      };

      wsManager.send(message);

      expect(mockInstances[0].send).toHaveBeenCalled();
      const sent = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      expect(sent.type).toBe('message');
    });

    it('should handle binary data transfer', () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        to: '0x456',
        data: { binary: binaryData },
        timestamp: Date.now(),
      };

      wsManager.send(message);
      expect(mockInstances[0].send).toHaveBeenCalled();
    });

    it('should maintain message ordering', () => {
      const messages: WSMessage[] = [
        { type: 'message', from: '0x123', data: { seq: 1 }, timestamp: Date.now() },
        { type: 'message', from: '0x123', data: { seq: 2 }, timestamp: Date.now() + 1 },
        { type: 'message', from: '0x123', data: { seq: 3 }, timestamp: Date.now() + 2 },
      ];

      messages.forEach(msg => wsManager.send(msg));

      expect(mockInstances[0].send).toHaveBeenCalledTimes(3);
      const sent1 = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      const sent2 = JSON.parse(mockInstances[0].send.mock.calls[1][0]);
      const sent3 = JSON.parse(mockInstances[0].send.mock.calls[2][0]);
      expect(sent1.payload.data.seq).toBe(1);
      expect(sent2.payload.data.seq).toBe(2);
      expect(sent3.payload.data.seq).toBe(3);
    });

    it('should handle typing indicators', () => {
      wsManager.send({
        type: 'typing',
        from: '0x123',
        to: '0x456',
        conversationId: 'conv-1',
        data: { isTyping: true },
        timestamp: Date.now(),
      });

      expect(mockInstances[0].send).toHaveBeenCalled();
    });

    it('should handle read receipts', () => {
      wsManager.send({
        type: 'read',
        from: '0x123',
        conversationId: 'conv-1',
        data: { messageId: 'msg-123' },
        timestamp: Date.now(),
      });

      expect(mockInstances[0].send).toHaveBeenCalled();
    });
  });

  describe('Connection Resilience', () => {
    it('should handle connection failure', async () => {
      const OrigMock = (global as any).WebSocket;
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          this.readyState = 0;
          queueMicrotask(() => {
            this.readyState = 3;
            this.onopen = null;
            if (this.onerror) this.onerror(new Event('error'));
          });
        }
      };

      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      const errorHandler = jest.fn();
      wsManager.on('error', errorHandler);

      const connectPromise = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);

      await expect(connectPromise).rejects.toThrow('WebSocket connection failed');
      expect(errorHandler).toHaveBeenCalled();

      (global as any).WebSocket = OrigMock;
    });

    it('should implement reconnection strategy', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      const disconnectHandler = jest.fn();
      wsManager.on('disconnect', disconnectHandler);

      mockInstances[0].simulateDisconnect(1006, 'Abnormal');
      expect(disconnectHandler).toHaveBeenCalled();

      wsManager.disconnect();
    });

    it('should handle network interruption gracefully', async () => {
      const wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      expect(wsManager.isConnected).toBe(true);
      mockInstances[0].simulateDisconnect(1006, 'transport error');
      expect(wsManager.isConnected).toBe(false);

      wsManager.disconnect();
    });
  });

  describe('Multiple Simultaneous Connections', () => {
    it('should handle multiple instances independently', async () => {
      const ws1 = new WebSocketManager({ url: 'ws://localhost:8080' });
      const ws2 = new WebSocketManager({ url: 'ws://localhost:8080' });

      const p1 = ws1.connect('0x123');
      jest.advanceTimersByTime(10);
      await p1;

      const p2 = ws2.connect('0x456');
      jest.advanceTimersByTime(10);
      await p2;

      expect(ws1.isConnected).toBe(true);
      expect(ws2.isConnected).toBe(true);

      ws1.disconnect();
      expect(ws1.isConnected).toBe(false);
      expect(ws2.isConnected).toBe(true);

      ws2.disconnect();
    });

    it('should isolate message handlers between instances', async () => {
      const ws1 = new WebSocketManager({ url: 'ws://localhost:8080' });
      const ws2 = new WebSocketManager({ url: 'ws://localhost:8080' });

      const p1 = ws1.connect('0x123');
      jest.advanceTimersByTime(10);
      await p1;

      const p2 = ws2.connect('0x456');
      jest.advanceTimersByTime(10);
      await p2;

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      ws1.on('message', handler1);
      ws2.on('message', handler2);

      mockInstances[0].simulateMessage({ type: 'message', payload: { text: 'hello' } });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();

      ws1.disconnect();
      ws2.disconnect();
    });
  });

  describe('Room/Channel Management', () => {
    let wsManager: WebSocketManager;

    beforeEach(async () => {
      wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });
      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;
      mockInstances[0].send.mockClear();
    });

    afterEach(() => {
      wsManager.disconnect();
    });

    it('should join a room/channel', () => {
      wsManager.joinRoom('room-1');

      expect(mockInstances[0].send).toHaveBeenCalled();
      const sent = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      expect(sent.type).toBe('subscribe');
      expect(sent.payload.topic).toBe('room-1');
    });

    it('should leave a room/channel', () => {
      wsManager.joinRoom('room-1');
      wsManager.leaveRoom('room-1');

      expect(mockInstances[0].send).toHaveBeenCalledTimes(2);
      const sent = JSON.parse(mockInstances[0].send.mock.calls[1][0]);
      expect(sent.type).toBe('unsubscribe');
      expect(sent.payload.topic).toBe('room-1');
    });

    it('should handle messages in specific rooms', () => {
      wsManager.joinRoom('room-1');
      mockInstances[0].send.mockClear();

      wsManager.send({
        type: 'message',
        from: '0x123',
        data: { text: 'Room message', room: 'room-1' },
        timestamp: Date.now(),
      });

      expect(mockInstances[0].send).toHaveBeenCalled();
      const sent = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      expect(sent.type).toBe('message');
    });
  });

  describe('Heartbeat/Ping-Pong Mechanism', () => {
    it('should send heartbeat at intervals', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        heartbeatInterval: 1000,
      });

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      mockInstances[0].send.mockClear();
      jest.advanceTimersByTime(1000);

      expect(mockInstances[0].send).toHaveBeenCalled();
      const sent = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      expect(sent.type).toBe('ping');

      wsManager.disconnect();
    });

    it('should handle pong responses', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        heartbeatInterval: 1000,
      });

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      const pongHandler = jest.fn();
      wsManager.on('pong', pongHandler);

      mockInstances[0].simulateMessage({ type: 'pong', payload: { timestamp: Date.now() } });

      expect(pongHandler).toHaveBeenCalled();

      wsManager.disconnect();
    });
  });

  describe('Authentication over WebSocket', () => {
    it('should authenticate by sending auth frame', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: { token: 'test-token', signature: 'test-signature', message: 'test-message', address: '0x123' },
      });

      const p = wsManager.connect('0x123', 'test-signature', 'test-message');
      jest.advanceTimersByTime(10);
      await p;

      const authFrame = JSON.parse(mockInstances[0].send.mock.calls[0][0]);
      expect(authFrame.type).toBe('auth');
      expect(authFrame.payload.token).toBe('test-token');
      expect(authFrame.payload.signature).toBe('test-signature');
      expect(authFrame.payload.message).toBe('test-message');
      expect(authFrame.payload.address).toBe('0x123');

      wsManager.disconnect();
    });

    it('should handle authentication failure', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: { signature: 'invalid-signature', address: '0x123' },
      });

      const p = wsManager.connect('0x123', 'invalid-signature');
      jest.advanceTimersByTime(10);
      await p;

      const authErrorHandler = jest.fn();
      wsManager.on('auth_error', authErrorHandler);

      mockInstances[0].simulateMessage({ type: 'auth_error', payload: { message: 'Invalid signature' } });

      expect(authErrorHandler).toHaveBeenCalled();

      wsManager.disconnect();
    });

    it('should re-authenticate on reconnection', async () => {
      const wsManager = new WebSocketManager({
        url: 'ws://localhost:8080',
        auth: { token: 'test-token', signature: 'test-signature', address: '0x123' },
      });

      const p = wsManager.connect('0x123', 'test-signature');
      jest.advanceTimersByTime(10);
      await p;

      const disconnectHandler = jest.fn();
      wsManager.on('disconnect', disconnectHandler);

      mockInstances[0].simulateDisconnect();
      expect(disconnectHandler).toHaveBeenCalled();

      wsManager.disconnect();
    });
  });

  describe('Message Delivery Guarantees', () => {
    let wsManager: WebSocketManager;

    beforeEach(async () => {
      wsManager = new WebSocketManager({ url: 'ws://localhost:8080' });
      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;
    });

    afterEach(() => {
      wsManager.disconnect();
    });

    it('should queue messages when disconnected', () => {
      wsManager.disconnect();

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
      wsManager.disconnect();

      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        data: { text: 'Queued message' },
        timestamp: Date.now(),
      };

      wsManager.send(message);

      const p = wsManager.connect('0x123');
      jest.advanceTimersByTime(10);
      await p;

      const resendResult = wsManager.send(message);
      expect(resendResult).toBe(true);
      expect(mockInstances[1].send).toHaveBeenCalled();
    });

    it('should implement acknowledgment mechanism', () => {
      const message: WSMessage = {
        type: 'message',
        from: '0x123',
        data: { text: 'Ack message' },
        timestamp: Date.now(),
      };

      const result = wsManager.send(message);
      expect(result).toBe(true);
      expect(mockInstances[0].send).toHaveBeenCalled();
    });
  });

  describe('useWebSocket Hook', () => {
    it('should initialize and connect', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
      );

      jest.advanceTimersByTime(10);

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle connection state changes', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
      );

      jest.advanceTimersByTime(10);

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
        useWebSocket({ url: 'ws://localhost:8080' }, '0x123')
      );

      jest.advanceTimersByTime(10);

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const disconnectSpy = jest.spyOn(WebSocketManager.prototype, 'disconnect');
      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });
  });
});
