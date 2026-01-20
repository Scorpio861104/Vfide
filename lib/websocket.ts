'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Message Types - aligned with Socket.IO server
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

/**
 * WebSocket Manager using Socket.IO for real-time messaging
 * Connects to VFIDE WebSocket server with authentication
 */
/**
 * Get default chain ID from environment or fallback
 */
function getDefaultChainId(): number {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) {
    const chainId = parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID, 10);
    if (!isNaN(chainId) && isFinite(chainId)) {
      return chainId;
    }
  }
  return 8453; // Base mainnet
}

export class WebSocketManager {
  private socket: Socket | null = null;
  private config: WSConfig;
  private messageHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private isConnecting = false;
  private isClosed = false;

  constructor(config: WSConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      auth: config.auth,
    };
  }

  /**
   * Connect to Socket.IO server with authentication
   */
  connect(userAddress: string, signature?: string, message?: string, chainId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        return reject(new Error('Already connecting'));
      }

      if (this.socket && this.socket.connected) {
        return resolve();
      }

      this.isConnecting = true;
      this.isClosed = false;

      try {
        // Create Socket.IO connection with authentication
        this.socket = io(this.config.url, {
          auth: {
            ...this.config.auth,
            signature,
            message,
            address: userAddress,
            chainId: chainId || getDefaultChainId(),
          },
          reconnection: true,
          reconnectionAttempts: this.config.maxReconnectAttempts,
          reconnectionDelay: this.config.reconnectInterval,
        });

        this.socket.on('connect', () => {
          console.log('[Socket.IO] Connected:', this.socket?.id);
          this.isConnecting = false;
          this.setupHeartbeat();
          this.emit('connect', { from: userAddress, data: null, timestamp: Date.now(), type: 'connect' });
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Socket.IO] Connection error:', error.message);
          this.isConnecting = false;
          this.emit('error', { from: '', data: error, timestamp: Date.now(), type: 'error' });
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[Socket.IO] Disconnected:', reason);
          this.emit('disconnect', { from: userAddress, data: { reason }, timestamp: Date.now(), type: 'disconnect' });
        });

        this.socket.on('error', (error) => {
          console.error('[Socket.IO] Error:', error);
          this.emit('error', { from: '', data: error, timestamp: Date.now(), type: 'error' });
        });
      } catch (e) {
        this.isConnecting = false;
        reject(e);
      }
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    this.isClosed = true;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Emit event to Socket.IO server
   */
  emit(event: string, data: unknown): boolean {
    if (!this.socket || !this.socket.connected) {
      console.error('[Socket.IO] Not connected');
      return false;
    }

    try {
      this.socket.emit(event, data);
      return true;
    } catch (e) {
      console.error('[Socket.IO] Failed to emit event:', e);
      return false;
    }
  }

  /**
   * Send message through WebSocket (backward compatibility)
   */
  send(message: Omit<WSMessage, 'timestamp'>): boolean {
    return this.emit('message', {
      ...message,
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to Socket.IO event
   */
  on(event: string, handler: (data: unknown) => void) {
    if (!this.socket) {
      console.warn('[Socket.IO] Not initialized');
      return () => {};
    }

    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
      
      // Register Socket.IO listener
      this.socket.on(event, (data: unknown) => {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
          handlers.forEach(h => h(data));
        }
      });
    }
    
    // Safe: We just ensured this event exists in the map above
    this.messageHandlers.get(event)!.add(handler);

    // Return unsubscribe function with proper cleanup
    return () => {
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        // If no handlers left, remove the event listener and clean up the map
        if (handlers.size === 0) {
          this.socket?.off(event);
          this.messageHandlers.delete(event);
        }
      }
    };
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat() {
    if (!this.socket) return;

    // Listen for server heartbeat pings
    this.socket.on('heartbeat:ping', (data) => {
      // Respond with pong
      this.socket?.emit('heartbeat:pong', data);
    });
  }

  /**
   * Get connection state
   */
  get isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  /**
   * Subscribe to governance updates
   */
  subscribeToGovernance() {
    this.emit('governance:subscribe', {});
  }

  /**
   * Subscribe to specific proposal
   */
  subscribeToProposal(proposalId: string) {
    this.emit('governance:proposal:subscribe', proposalId);
  }

  /**
   * Subscribe to chat channel
   */
  subscribeToChat(channel: string) {
    this.emit('chat:channel:join', channel);
  }

  /**
   * Subscribe to personal notifications
   */
  subscribeToNotifications() {
    this.emit('notifications:subscribe', {});
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
    // Wrap handler to ensure type safety when receiving unknown data
    const wrappedHandler = (data: unknown) => {
      // Type guard: ensure data is a valid WSMessage
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        'from' in data &&
        'timestamp' in data
      ) {
        handler(data as WSMessage);
      } else {
        console.warn('[useWebSocket] Received invalid message format:', data);
      }
    };
    return wsRef.current?.on(type, wrappedHandler) || (() => {});
  }, []);

  const getWebSocket = useCallback(() => wsRef.current, []);

  return {
    isConnected,
    send,
    subscribe,
    getWebSocket,
  };
}

/**
 * Get WebSocket URL from environment or default
 */
export function getWebSocketURL(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering - use environment variable
    return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';
  }
  
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Development: use localhost WebSocket server
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }

  // Production: use same protocol as the web app
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const host = window.location.host;
  
  // In production, you would deploy the WebSocket server separately
  // and use its URL here (e.g., 'https://ws.vfide.com')
  return process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${host}`;
}
