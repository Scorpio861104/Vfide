'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket Message Types
 */
export type WSMessageType =
  | 'connect'
  | 'disconnect'
  | 'message'
  | 'typing'
  | 'read'
  | 'presence'
  | 'notification'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  from: string;
  to?: string;
  conversationId?: string;
  data: any;
  timestamp: number;
}

export interface WSConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * WebSocket Manager for real-time messaging
 * NOTE: This requires a WebSocket server to be running
 * For development, you can use a local WebSocket server or mock service
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WSConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<WSMessageType, Set<(message: WSMessage) => void>> = new Map();
  private isConnecting = false;
  private isClosed = false;

  constructor(config: WSConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(userAddress: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        return reject(new Error('Already connecting'));
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return resolve();
      }

      this.isConnecting = true;
      this.isClosed = false;

      try {
        // Add user address to URL for authentication
        const url = `${this.config.url}?address=${userAddress}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connect', { from: userAddress, data: null, timestamp: Date.now(), type: 'connect' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[WebSocket] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          this.emit('error', { from: '', data: error, timestamp: Date.now(), type: 'error' });
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Closed:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!this.isClosed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect(userAddress);
          }
        };
      } catch (e) {
        this.isConnecting = false;
        reject(e);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isClosed = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(message: Omit<WSMessage, 'timestamp'>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Not connected');
      return false;
    }

    try {
      const fullMessage: WSMessage = {
        ...message,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(fullMessage));
      return true;
    } catch (e) {
      console.error('[WebSocket] Failed to send message:', e);
      return false;
    }
  }

  /**
   * Subscribe to specific message type
   */
  on(type: WSMessageType, handler: (message: WSMessage) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Emit message to handlers
   */
  private emit(type: WSMessageType, message: WSMessage) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WSMessage) {
    this.emit(message.type, message);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnect attempt
   */
  private scheduleReconnect(userAddress: string) {
    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(userAddress).catch(e => {
        console.error('[WebSocket] Reconnect failed:', e);
      });
    }, this.config.reconnectInterval);
  }

  /**
   * Get connection state
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * React hook for WebSocket connection
 */
export function useWebSocket(config: WSConfig, userAddress?: string) {
  const wsRef = useRef<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userAddress || typeof window === 'undefined') return;

    // Initialize WebSocket manager
    wsRef.current = new WebSocketManager(config);

    // Connect to WebSocket server
    wsRef.current.connect(userAddress).then(() => {
      setIsConnected(true);
    }).catch(e => {
      console.error('[useWebSocket] Failed to connect:', e);
    });

    // Listen for connection status
    const unsubscribeConnect = wsRef.current.on('connect', () => {
      setIsConnected(true);
    });

    const unsubscribeDisconnect = wsRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [config.url, userAddress]);

  const send = useCallback((message: Omit<WSMessage, 'timestamp'>) => {
    return wsRef.current?.send(message) || false;
  }, []);

  const subscribe = useCallback((type: WSMessageType, handler: (message: WSMessage) => void) => {
    return wsRef.current?.on(type, handler) || (() => {});
  }, []);

  return {
    isConnected,
    send,
    subscribe,
    ws: wsRef.current,
  };
}

/**
 * Get WebSocket URL from environment or default
 */
export function getWebSocketURL(): string {
  if (typeof window === 'undefined') return '';
  
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Default to localhost for development
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // In production, you would use your WebSocket server URL
  // For now, return a placeholder
  return `${protocol}//${host}/ws`;
}
