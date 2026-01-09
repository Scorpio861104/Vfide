import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const MAX_CONNECTIONS = parseInt(process.env.RATE_LIMIT_MAX_CONNECTIONS_PER_IP || '10');
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute

/**
 * Rate limiting middleware to prevent abuse
 * Limits connections per IP address
 */
export const rateLimitMiddleware = (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  const ip = socket.handshake.address;
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitMap.get(ip);

  // Reset if window has expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    rateLimitMap.set(ip, entry);
    return next();
  }

  // Check if limit exceeded
  if (entry.count >= MAX_CONNECTIONS) {
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    return next(new Error('Too many connections. Please try again later.'));
  }

  // Increment count
  entry.count++;
  rateLimitMap.set(ip, entry);

  // Cleanup expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  next();
};

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

// Periodic cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
