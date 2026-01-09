import { Socket } from 'socket.io';

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '30000'); // 30 seconds
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT || '5000'); // 5 seconds

/**
 * Setup heartbeat mechanism to keep connection alive
 * and detect dead connections
 */
export const setupHeartbeat = (socket: Socket) => {
  let heartbeatTimeout: NodeJS.Timeout;

  const sendHeartbeat = () => {
    socket.emit('heartbeat:ping', { timestamp: Date.now() });

    // Set timeout for pong response
    heartbeatTimeout = setTimeout(() => {
      // No pong received, disconnect
      socket.disconnect(true);
    }, HEARTBEAT_TIMEOUT);
  };

  // Handle pong response
  socket.on('heartbeat:pong', () => {
    clearTimeout(heartbeatTimeout);
  });

  // Start heartbeat interval
  const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  // Clean up on disconnect
  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
    clearTimeout(heartbeatTimeout);
  });
};
