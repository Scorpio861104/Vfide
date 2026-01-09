import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface Notification {
  id: string;
  type: 'proposal' | 'vote' | 'delegation' | 'transfer' | 'badge' | 'system';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  chainId: number;
}

/**
 * Handle notification events
 */
export const notificationHandlers = (io: Server, socket: Socket) => {
  const address = socket.data.address;

  // Subscribe to personal notifications
  socket.on('notifications:subscribe', () => {
    const channel = `notifications:${address}`;
    socket.join(channel);
    logger.debug(`${address} subscribed to personal notifications`);
    socket.emit('notifications:subscribed', { channel });
  });

  // Unsubscribe from personal notifications
  socket.on('notifications:unsubscribe', () => {
    const channel = `notifications:${address}`;
    socket.leave(channel);
    logger.debug(`${address} unsubscribed from personal notifications`);
    socket.emit('notifications:unsubscribed', { channel });
  });

  // Mark notification as read
  socket.on('notifications:read', (notificationId: string) => {
    logger.debug(`Notification ${notificationId} marked as read by ${address}`);
    
    // In a real implementation, update database
    socket.emit('notifications:read:confirmed', { notificationId });
  });

  // Mark all notifications as read
  socket.on('notifications:read:all', () => {
    logger.debug(`All notifications marked as read by ${address}`);
    
    // In a real implementation, update database
    socket.emit('notifications:read:all:confirmed', { timestamp: Date.now() });
  });

  // Request unread count
  socket.on('notifications:unread:count', () => {
    // In a real implementation, query database
    socket.emit('notifications:unread:count:response', { count: 0 });
  });

  // Request notification history
  socket.on('notifications:history', (data: { limit?: number; offset?: number }) => {
    logger.debug(`Notification history request from ${address}`);
    
    // In a real implementation, fetch from database
    socket.emit('notifications:history:response', {
      notifications: [],
      total: 0,
      hasMore: false,
    });
  });
};

/**
 * Send notification to a specific user
 */
export const sendNotification = (io: Server, address: string, notification: Notification) => {
  const channel = `notifications:${address}`;
  io.to(channel).emit('notifications:new', notification);
  logger.info(`Notification sent to ${address}: ${notification.type}`);
};

/**
 * Broadcast notification to all users
 */
export const broadcastNotification = (io: Server, notification: Notification) => {
  io.emit('notifications:broadcast', notification);
  logger.info(`Notification broadcasted: ${notification.type}`);
};
