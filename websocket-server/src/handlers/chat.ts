import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface ChatMessage {
  id: string;
  channel: string;
  author: string;
  content: string;
  timestamp: number;
  chainId: number;
}

interface TypingIndicator {
  channel: string;
  user: string;
  isTyping: boolean;
}

/**
 * Handle chat and messaging events
 */
export const chatHandlers = (io: Server, socket: Socket) => {
  const address = socket.data.address;

  // Send message to channel
  socket.on('chat:message:send', (message: ChatMessage) => {
    // Validate message author matches authenticated address
    if (message.author.toLowerCase() !== address.toLowerCase()) {
      socket.emit('chat:error', { 
        error: 'Unauthorized',
        message: 'Message author must match authenticated address'
      });
      return;
    }

    logger.info(`Message from ${address} in ${message.channel}`);
    
    // Broadcast to channel
    io.to(`chat:${message.channel}`).emit('chat:message:received', message);
  });

  // Join chat channel
  socket.on('chat:channel:join', (channel: string) => {
    socket.join(`chat:${channel}`);
    logger.debug(`${address} joined chat channel: ${channel}`);
    
    // Notify channel members
    io.to(`chat:${channel}`).emit('chat:user:joined', {
      channel,
      user: address,
      timestamp: Date.now(),
    });
    
    socket.emit('chat:channel:joined', { channel });
  });

  // Leave chat channel
  socket.on('chat:channel:leave', (channel: string) => {
    socket.leave(`chat:${channel}`);
    logger.debug(`${address} left chat channel: ${channel}`);
    
    // Notify channel members
    io.to(`chat:${channel}`).emit('chat:user:left', {
      channel,
      user: address,
      timestamp: Date.now(),
    });
    
    socket.emit('chat:channel:left', { channel });
  });

  // Typing indicator
  socket.on('chat:typing', (indicator: TypingIndicator) => {
    // Broadcast typing indicator to channel (except sender)
    socket.to(`chat:${indicator.channel}`).emit('chat:typing:update', {
      ...indicator,
      user: address,
    });
  });

  // Request message history
  socket.on('chat:history:request', (data: { channel: string; limit?: number; before?: number }) => {
    logger.debug(`History request from ${address} for ${data.channel}`);
    
    // In a real implementation, fetch from database
    // For now, return empty array
    socket.emit('chat:history:received', {
      channel: data.channel,
      messages: [],
      hasMore: false,
    });
  });

  // Message reaction
  socket.on('chat:message:react', (data: { messageId: string; emoji: string; channel: string }) => {
    logger.debug(`Reaction from ${address} on message ${data.messageId}`);
    
    io.to(`chat:${data.channel}`).emit('chat:message:reaction', {
      ...data,
      user: address,
      timestamp: Date.now(),
    });
  });

  // Auto-leave all chat channels on disconnect
  socket.on('disconnect', () => {
    // Get all rooms the socket is in
    const rooms = Array.from(socket.rooms).filter(room => room.startsWith('chat:'));
    
    rooms.forEach(room => {
      const channel = room.replace('chat:', '');
      io.to(room).emit('chat:user:left', {
        channel,
        user: address,
        timestamp: Date.now(),
      });
    });
  });
};
