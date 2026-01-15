/**
 * VFIDE WebSocket Server
 * Real-time messaging and notifications using Socket.IO
 * 
 * Features:
 * - Wallet signature authentication
 * - Real-time message delivery
 * - Typing indicators
 * - Presence tracking
 * - Notification broadcasts
 * - Heartbeat mechanism
 */

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyMessage } from 'viem';

const PORT = process.env.WS_PORT || 8080;

// CORS Configuration
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.CORS_ORIGIN;
  
  if (envOrigins === '*') {
    console.warn('⚠️  [Security] CORS set to allow all origins. Not recommended for production!');
    return ['*'];
  }
  
  if (!envOrigins) {
    // Default allowed origins for development
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
  }
  
  // Parse comma-separated list of origins
  return envOrigins.split(',').map(origin => origin.trim());
};

const ALLOWED_ORIGINS = getAllowedOrigins();
const CORS_ORIGIN = ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS;

interface SocketAuth {
  address?: string;
  signature?: string;
  message?: string;
  chainId?: number;
}

interface AuthenticatedSocket extends Socket {
  userAddress?: string;
  chainId?: number;
  heartbeatInterval?: NodeJS.Timeout;
}

// Track connected users
const connectedUsers = new Map<string, Set<string>>(); // address -> Set<socketId>
const socketToAddress = new Map<string, string>(); // socketId -> address

/**
 * Verify wallet signature
 */
async function verifyAuth(auth: SocketAuth): Promise<boolean> {
  if (!auth.address || !auth.signature || !auth.message) {
    return false;
  }

  try {
    const isValid = await verifyMessage({
      address: auth.address as `0x${string}`,
      message: auth.message,
      signature: auth.signature as `0x${string}`,
    });

    return isValid;
  } catch (error) {
    console.error('[Auth] Verification failed:', error);
    return false;
  }
}

/**
 * Initialize Socket.IO server
 */
function startWebSocketServer() {
  const httpServer = createServer();
  
  // Configure CORS with origin validation
  const corsOptions = ALLOWED_ORIGINS.includes('*') 
    ? { origin: '*', methods: ['GET', 'POST'], credentials: true }
    : {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // Allow requests with no origin (like mobile apps or curl)
          if (!origin) return callback(null, true);
          
          if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
          } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      };
  
  const io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const auth = socket.handshake.auth as SocketAuth;

    // Allow connection without auth ONLY in development with explicit flag
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true' && !auth.signature) {
      console.warn('⚠️  [WebSocket Security] Development mode: Authentication bypass is ENABLED');
      console.warn('⚠️  This should NEVER be enabled in production!');
      console.warn(`⚠️  Environment: ${process.env.NODE_ENV}, Bypass: ${process.env.ALLOW_DEV_AUTH_BYPASS}`);
      socket.userAddress = auth.address || 'dev-user';
      socket.chainId = auth.chainId || 8453;
      return next();
    }

    // Block any bypass attempts in non-development environments
    if (process.env.NODE_ENV !== 'development' && !auth.signature) {
      console.error('🚫 [WebSocket Security] Authentication required in production');
      return next(new Error('Authentication required'));
    }

    // Verify wallet signature
    const isValid = await verifyAuth(auth);
    if (!isValid) {
      return next(new Error('Authentication failed'));
    }

    // Attach user info to socket
    socket.userAddress = auth.address;
    socket.chainId = auth.chainId;
    next();
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userAddress = socket.userAddress!;
    
    console.log(`[Connected] ${userAddress} (${socket.id})`);

    // Track connection
    if (!connectedUsers.has(userAddress)) {
      connectedUsers.set(userAddress, new Set());
    }
    connectedUsers.get(userAddress)!.add(socket.id);
    socketToAddress.set(socket.id, userAddress);

    // Broadcast presence
    io.emit('presence', {
      type: 'user_online',
      address: userAddress,
      timestamp: Date.now(),
    });

    // ============ MESSAGE HANDLING ============

    socket.on('message', (data) => {
      const { to, conversationId, content, encrypted } = data;

      // Relay message to recipient
      const recipientSockets = connectedUsers.get(to);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('message', {
            type: 'message',
            from: userAddress,
            to,
            conversationId,
            data: { content, encrypted },
            timestamp: Date.now(),
          });
        });
      }

      // Acknowledge to sender
      socket.emit('message:sent', {
        conversationId,
        timestamp: Date.now(),
      });
    });

    // ============ TYPING INDICATORS ============

    socket.on('typing:start', (data) => {
      const { to, conversationId } = data;
      const recipientSockets = connectedUsers.get(to);
      
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('typing', {
            type: 'typing',
            from: userAddress,
            conversationId,
            data: { isTyping: true },
            timestamp: Date.now(),
          });
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { to, conversationId } = data;
      const recipientSockets = connectedUsers.get(to);
      
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('typing', {
            type: 'typing',
            from: userAddress,
            conversationId,
            data: { isTyping: false },
            timestamp: Date.now(),
          });
        });
      }
    });

    // ============ READ RECEIPTS ============

    socket.on('message:read', (data) => {
      const { messageId, from } = data;
      const senderSockets = connectedUsers.get(from);
      
      if (senderSockets) {
        senderSockets.forEach((socketId) => {
          io.to(socketId).emit('read', {
            type: 'read',
            from: userAddress,
            data: { messageId },
            timestamp: Date.now(),
          });
        });
      }
    });

    // ============ NOTIFICATIONS ============

    socket.on('notifications:subscribe', () => {
      socket.join(`notifications:${userAddress}`);
      console.log(`[Notifications] ${userAddress} subscribed`);
    });

    // Broadcast notification to user
    socket.on('notification:send', (data) => {
      const { to, title, body, type } = data;
      io.to(`notifications:${to}`).emit('notification', {
        type: 'notification',
        from: userAddress,
        data: { title, body, type },
        timestamp: Date.now(),
      });
    });

    // ============ GOVERNANCE ============

    socket.on('governance:subscribe', () => {
      socket.join('governance:updates');
      console.log(`[Governance] ${userAddress} subscribed to updates`);
    });

    socket.on('governance:proposal:subscribe', (proposalId: string) => {
      socket.join(`governance:proposal:${proposalId}`);
      console.log(`[Governance] ${userAddress} subscribed to proposal ${proposalId}`);
    });

    // Broadcast governance event
    socket.on('governance:event', (data) => {
      const { proposalId, event, details } = data;
      
      if (proposalId) {
        io.to(`governance:proposal:${proposalId}`).emit('governance:update', {
          proposalId,
          event,
          details,
          timestamp: Date.now(),
        });
      }
      
      io.to('governance:updates').emit('governance:update', {
        proposalId,
        event,
        details,
        timestamp: Date.now(),
      });
    });

    // ============ CHAT CHANNELS ============

    socket.on('chat:channel:join', (channel: string) => {
      socket.join(`chat:${channel}`);
      console.log(`[Chat] ${userAddress} joined channel ${channel}`);
      
      io.to(`chat:${channel}`).emit('chat:user:joined', {
        channel,
        address: userAddress,
        timestamp: Date.now(),
      });
    });

    socket.on('chat:channel:leave', (channel: string) => {
      socket.leave(`chat:${channel}`);
      console.log(`[Chat] ${userAddress} left channel ${channel}`);
      
      io.to(`chat:${channel}`).emit('chat:user:left', {
        channel,
        address: userAddress,
        timestamp: Date.now(),
      });
    });

    socket.on('chat:message', (data) => {
      const { channel, content } = data;
      
      io.to(`chat:${channel}`).emit('chat:message', {
        channel,
        from: userAddress,
        content,
        timestamp: Date.now(),
      });
    });

    // ============ HEARTBEAT ============

    // Store heartbeat interval on socket for better tracking
    socket.heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat:ping', { timestamp: Date.now() });
    }, 30000);

    socket.on('heartbeat:pong', (data) => {
      // Update last seen
      console.log(`[Heartbeat] ${userAddress} responded`);
    });

    // ============ DISCONNECT ============

    socket.on('disconnect', (reason) => {
      console.log(`[Disconnected] ${userAddress} (${reason})`);
      
      // Cleanup tracking
      if (socket.heartbeatInterval) {
        clearInterval(socket.heartbeatInterval);
      }
      
      const userSockets = connectedUsers.get(userAddress);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userAddress);
          
          // Broadcast offline status
          io.emit('presence', {
            type: 'user_offline',
            address: userAddress,
            timestamp: Date.now(),
          });
        }
      }
      
      socketToAddress.delete(socket.id);
    });

    // ============ ERROR HANDLING ============

    socket.on('error', (error) => {
      console.error(`[Error] ${userAddress}:`, error);
      socket.emit('error', {
        type: 'error',
        data: { message: error.message || 'Unknown error' },
        timestamp: Date.now(),
      });
    });
  });

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 VFIDE WebSocket Server running on port ${PORT}`);
    console.log(`   CORS Origin: ${CORS_ORIGIN}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('\n[Ready] Waiting for connections...\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n[Shutdown] Closing WebSocket server...');
    io.close(() => {
      httpServer.close(() => {
        console.log('[Shutdown] Server closed');
        process.exit(0);
      });
    });
  });
}

// Start the server
startWebSocketServer();
