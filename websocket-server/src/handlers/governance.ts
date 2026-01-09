import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface ProposalUpdate {
  proposalId: string;
  type: 'created' | 'updated' | 'executed' | 'cancelled' | 'queued';
  data: any;
  timestamp: number;
  chainId: number;
}

interface VoteEvent {
  proposalId: string;
  voter: string;
  support: boolean;
  votes: string;
  reason?: string;
  timestamp: number;
  chainId: number;
}

/**
 * Handle governance-related events
 */
export const governanceHandlers = (io: Server, socket: Socket) => {
  // Broadcast proposal update
  socket.on('governance:proposal:update', (update: ProposalUpdate) => {
    logger.info(`Proposal update: ${update.proposalId} (${update.type})`);
    
    // Broadcast to all clients in the governance channel
    io.to('governance').emit('governance:proposal:updated', update);
    
    // Also broadcast to specific proposal channel
    io.to(`proposal:${update.proposalId}`).emit('governance:proposal:updated', update);
  });

  // Broadcast vote event
  socket.on('governance:vote', (vote: VoteEvent) => {
    logger.info(`Vote cast: ${vote.voter} on ${vote.proposalId}`);
    
    // Broadcast to governance channel
    io.to('governance').emit('governance:vote:cast', vote);
    
    // Broadcast to specific proposal channel
    io.to(`proposal:${vote.proposalId}`).emit('governance:vote:cast', vote);
  });

  // Subscribe to governance updates
  socket.on('governance:subscribe', () => {
    socket.join('governance');
    logger.debug(`${socket.id} subscribed to governance`);
    socket.emit('governance:subscribed', { channel: 'governance' });
  });

  // Subscribe to specific proposal
  socket.on('governance:proposal:subscribe', (proposalId: string) => {
    socket.join(`proposal:${proposalId}`);
    logger.debug(`${socket.id} subscribed to proposal ${proposalId}`);
    socket.emit('governance:proposal:subscribed', { proposalId });
  });

  // Unsubscribe from governance
  socket.on('governance:unsubscribe', () => {
    socket.leave('governance');
    logger.debug(`${socket.id} unsubscribed from governance`);
    socket.emit('governance:unsubscribed', { channel: 'governance' });
  });

  // Unsubscribe from specific proposal
  socket.on('governance:proposal:unsubscribe', (proposalId: string) => {
    socket.leave(`proposal:${proposalId}`);
    logger.debug(`${socket.id} unsubscribed from proposal ${proposalId}`);
    socket.emit('governance:proposal:unsubscribed', { proposalId });
  });

  // Request current state (for reconnection)
  socket.on('governance:sync', (data: { proposalIds?: string[] }) => {
    logger.debug(`Sync request from ${socket.id}`);
    // In a real implementation, fetch current state from database
    // For now, just acknowledge
    socket.emit('governance:synced', { 
      timestamp: Date.now(),
      proposalIds: data.proposalIds || []
    });
  });
};
