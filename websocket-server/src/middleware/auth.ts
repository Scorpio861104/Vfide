import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

interface AuthToken {
  address: string;
  chainId: number;
  exp?: number;
}

/**
 * Authentication middleware for Socket.IO
 * Supports two methods:
 * 1. JWT token authentication
 * 2. Ethereum signature verification
 */
export const authMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    const token = socket.handshake.auth.token;
    const signature = socket.handshake.auth.signature;
    const message = socket.handshake.auth.message;
    const address = socket.handshake.auth.address;

    // Method 1: JWT Token Authentication
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
        socket.data.address = decoded.address;
        socket.data.chainId = decoded.chainId;
        logger.debug(`Authenticated via JWT: ${decoded.address}`);
        return next();
      } catch (error) {
        logger.warn(`Invalid JWT token: ${error}`);
        return next(new Error('Invalid authentication token'));
      }
    }

    // Method 2: Ethereum Signature Verification
    if (signature && message && address) {
      try {
        // Verify the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
          logger.warn(`Signature verification failed for ${address}`);
          return next(new Error('Invalid signature'));
        }

        // Check message timestamp (must be within 5 minutes)
        const messageMatch = message.match(/Timestamp: (\d+)/);
        if (messageMatch) {
          const timestamp = parseInt(messageMatch[1]);
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (Math.abs(now - timestamp) > fiveMinutes) {
            logger.warn(`Expired signature for ${address}`);
            return next(new Error('Signature expired'));
          }
        }

        socket.data.address = address;
        socket.data.chainId = socket.handshake.auth.chainId || 8453; // Default to Base
        logger.debug(`Authenticated via signature: ${address}`);
        return next();
      } catch (error) {
        logger.warn(`Signature verification error: ${error}`);
        return next(new Error('Signature verification failed'));
      }
    }

    // No valid authentication method provided
    logger.warn('No authentication credentials provided');
    return next(new Error('Authentication required'));
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return next(new Error('Authentication failed'));
  }
};

/**
 * Generate a JWT token for a given address
 */
export const generateToken = (address: string, chainId: number): string => {
  return jwt.sign(
    { address, chainId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};
