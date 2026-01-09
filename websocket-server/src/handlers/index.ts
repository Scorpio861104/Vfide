import { Server, Socket } from 'socket.io';
import { logger } from './utils/logger';
import { governanceHandlers } from './handlers/governance';
import { chatHandlers } from './handlers/chat';
import { notificationHandlers } from './handlers/notification';

/**
 * Register all event handlers for a socket connection
 */
export const registerEventHandlers = (io: Server, socket: Socket) => {
  // Governance events
  governanceHandlers(io, socket);

  // Chat/messaging events
  chatHandlers(io, socket);

  // Notification events
  notificationHandlers(io, socket);

  // Generic subscribe/unsubscribe handlers
  socket.on('subscribe', (channel: string) => {
    socket.join(channel);
    logger.debug(`${socket.id} joined channel: ${channel}`);
    socket.emit('subscribed', { channel });
  });

  socket.on('unsubscribe', (channel: string) => {
    socket.leave(channel);
    logger.debug(`${socket.id} left channel: ${channel}`);
    socket.emit('unsubscribed', { channel });
  });

  // Handle client errors
  socket.on('error:client', (error) => {
    logger.error(`Client error from ${socket.id}:`, error);
  });
};
