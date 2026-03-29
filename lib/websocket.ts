'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export type WSMessageType =
  | 'authenticated'
  | 'auth_error'
  | 'connect'
  | 'disconnect'
  | 'message'
  | 'typing'
  | 'read'
  | 'presence'
  | 'notification'
  | 'error'
  | 'connected'
  | 'pong'
  | 'subscribed'
  | 'unsubscribed';

const WS_PROTOCOL_VERSION = 1;

export interface WSMessage {
  type: WSMessageType;
  from: string;
  to?: string;
  conversationId?: string;
  data: unknown;
  timestamp: number;
}

export interface WSConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  auth?: {
    token?: string;
    signature?: string;
    message?: string;
    address?: string;
    chainId?: number;
  };
}

function getDefaultChainId(): number {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) {
    const chainId = parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID, 10);
    if (!isNaN(chainId) && isFinite(chainId)) {
      return chainId;
    }
  }
  return 8453;
}

function toWebSocketUrl(url: string): string {
  if (url.startsWith('http://')) return `ws://${url.slice('http://'.length)}`;
  if (url.startsWith('https://')) return `wss://${url.slice('https://'.length)}`;
  return url;
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private config: WSConfig;
  private messageHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;

  constructor(config: WSConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      auth: config.auth,
    };
  }

  connect(userAddress: string, signature?: string, message?: string, chainId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        reject(new Error('Already connecting'));
        return;
      }
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;
      const endpoint = new URL(toWebSocketUrl(this.config.url));
      const authPayload = this.buildAuthPayload(userAddress, signature, message, chainId);

      try {
        this.socket = new WebSocket(endpoint.toString());

        this.socket.onopen = () => {
          this.isConnecting = false;
          if (authPayload) {
            this.emit('auth', authPayload);
          }
          this.setupHeartbeat();
          this.dispatch('connect', { from: userAddress, data: null, timestamp: Date.now(), type: 'connect' });
          resolve();
        };

        this.socket.onerror = () => {
          this.isConnecting = false;
          const error = new Error('WebSocket connection failed');
          this.dispatch('error', { from: '', data: error.message, timestamp: Date.now(), type: 'error' });
          reject(error);
        };

        this.socket.onclose = (event) => {
          this.clearHeartbeat();
          this.dispatch('disconnect', {
            from: userAddress,
            data: { code: event.code, reason: event.reason },
            timestamp: Date.now(),
            type: 'disconnect',
          });
        };

        this.socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data as string) as { type?: string; payload?: unknown };
            const type = payload.type || 'message';
            this.dispatch(type, payload.payload ?? payload);
          } catch {
            this.dispatch('message', event.data);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    this.clearHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  emit(event: string, data: unknown): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    let outbound: unknown;
    if (event === 'ping') {
      outbound = { type: 'ping', payload: data || {} };
    } else if (event === 'auth' && data && typeof data === 'object') {
      outbound = { type: 'auth', payload: data };
    } else if (event === 'governance:subscribe') {
      outbound = { type: 'subscribe', payload: { topic: 'governance' } };
    } else if (event === 'notifications:subscribe') {
      outbound = { type: 'subscribe', payload: { topic: 'notifications' } };
    } else if (event === 'chat:channel:join' && typeof data === 'string') {
      outbound = { type: 'subscribe', payload: { topic: `chat.${data}` } };
    } else if (event === 'leave' && typeof data === 'string') {
      outbound = { type: 'unsubscribe', payload: { topic: data } };
    } else if (event === 'join' && typeof data === 'string') {
      outbound = { type: 'subscribe', payload: { topic: data } };
    } else if (event === 'message') {
      outbound = { type: 'message', payload: data };
    } else {
      outbound = { type: 'message', payload: { event, data } };
    }

    if (outbound && typeof outbound === 'object') {
      (outbound as Record<string, unknown>).v = WS_PROTOCOL_VERSION;
    }

    this.socket.send(JSON.stringify(outbound));
    return true;
  }

  send(message: Omit<WSMessage, 'timestamp'>): boolean {
    return this.emit('message', {
      ...message,
      timestamp: Date.now(),
    });
  }

  on(event: string, handler: (data: unknown) => void) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(event);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(event);
      }
    };
  }

  private dispatch(event: string, data: unknown) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  private setupHeartbeat() {
    this.clearHeartbeat();
    if (!this.config.heartbeatInterval || this.config.heartbeatInterval <= 0) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.emit('ping', { ts: Date.now() });
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  get isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  subscribeToGovernance() {
    this.emit('governance:subscribe', {});
  }

  subscribeToProposal(proposalId: string) {
    this.emit('join', `proposal.${proposalId}`);
  }

  subscribeToChat(channel: string) {
    this.emit('chat:channel:join', channel);
  }

  subscribeToNotifications() {
    this.emit('notifications:subscribe', {});
  }

  joinRoom(room: string) {
    this.emit('join', room);
  }

  leaveRoom(room: string) {
    this.emit('leave', room);
  }

  private buildAuthPayload(userAddress: string, signature?: string, message?: string, chainId?: number): Record<string, unknown> | null {
    const token = this.config.auth?.token;
    if (!token) {
      return null;
    }

    const payload: Record<string, unknown> = {
      token,
      address: userAddress,
      chainId: chainId || this.config.auth?.chainId || getDefaultChainId(),
    };

    if (signature || this.config.auth?.signature) {
      payload.signature = signature || this.config.auth?.signature;
    }
    if (message || this.config.auth?.message) {
      payload.message = message || this.config.auth?.message;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }
}

export function useWebSocket(config: WSConfig, userAddress?: string) {
  const wsRef = useRef<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!userAddress || typeof window === 'undefined') return;

    wsRef.current = new WebSocketManager(config);

    const maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    const baseReconnectInterval = config.reconnectInterval ?? 3000;
    let isUnmounted = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (isUnmounted || reconnectAttemptRef.current >= maxReconnectAttempts) {
        return;
      }

      const exponentialDelay = Math.min(baseReconnectInterval * Math.pow(2, reconnectAttemptRef.current), 30000);
      const jitter = Math.floor(Math.random() * 500);
      reconnectAttemptRef.current += 1;

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        if (!isUnmounted && wsRef.current) {
          wsRef.current
            .connect(userAddress)
            .then(() => setIsConnected(true))
            .catch((e) => {
              logger.error('[useWebSocket] Reconnect attempt failed:', e);
              scheduleReconnect();
            });
        }
      }, exponentialDelay + jitter);
    };

    wsRef.current
      .connect(userAddress)
      .then(() => {
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
      })
      .catch((e) => {
        logger.error('[useWebSocket] Failed to connect:', e);
        scheduleReconnect();
      });

    const unsubscribeConnect = wsRef.current.on('connect', () => {
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      setIsConnected(true);
    });
    const unsubscribeDisconnect = wsRef.current.on('disconnect', () => {
      setIsConnected(false);
      scheduleReconnect();
    });

    return () => {
      isUnmounted = true;
      clearReconnectTimer();
      unsubscribeConnect();
      unsubscribeDisconnect();
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [config.url, config.reconnectInterval, config.maxReconnectAttempts, userAddress]);

  const send = useCallback((message: Omit<WSMessage, 'timestamp'>) => wsRef.current?.send(message) || false, []);

  const subscribe = useCallback((type: WSMessageType, handler: (message: WSMessage) => void) => {
    const wrappedHandler = (data: unknown) => {
      if (data && typeof data === 'object' && 'type' in (data as Record<string, unknown>) && 'timestamp' in (data as Record<string, unknown>)) {
        handler(data as WSMessage);
      }
    };
    return wsRef.current?.on(type, wrappedHandler) || (() => {});
  }, []);

  const getWebSocket = useCallback(() => wsRef.current, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    send,
    subscribe,
    getWebSocket,
    disconnect,
  };
}

export function getWebSocketURL(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
  }

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return toWebSocketUrl(process.env.NEXT_PUBLIC_WS_URL);
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'ws://localhost:8080';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}
