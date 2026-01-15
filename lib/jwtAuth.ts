/**
 * JWT Authentication Utility
 * 
 * To use this, install the required package:
 * npm install jsonwebtoken @types/jsonwebtoken
 * 
 * Then uncomment the import and implementation below.
 */

// import jwt from 'jsonwebtoken';

/**
 * JWT Configuration
 */
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-DO-NOT-USE-IN-PRODUCTION';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'; // 24 hours
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days

export interface TokenPayload {
  address: string;
  chainId?: number;
  issuedAt: number;
  type: 'access' | 'refresh';
}

/**
 * Generate access token
 * 
 * Uncomment when jsonwebtoken is installed:
 * 
 * export function generateAccessToken(address: string, chainId?: number): string {
 *   const payload: TokenPayload = {
 *     address: address.toLowerCase(),
 *     chainId,
 *     issuedAt: Date.now(),
 *     type: 'access',
 *   };
 *   
 *   return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
 * }
 */

/**
 * Generate refresh token
 * 
 * Uncomment when jsonwebtoken is installed:
 * 
 * export function generateRefreshToken(address: string, chainId?: number): string {
 *   const payload: TokenPayload = {
 *     address: address.toLowerCase(),
 *     chainId,
 *     issuedAt: Date.now(),
 *     type: 'refresh',
 *   };
 *   
 *   return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
 * }
 */

/**
 * Verify and decode token
 * 
 * Uncomment when jsonwebtoken is installed:
 * 
 * export function verifyToken(token: string): TokenPayload {
 *   try {
 *     const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
 *     return decoded;
 *   } catch (error) {
 *     if (error instanceof jwt.TokenExpiredError) {
 *       throw new Error('Token expired');
 *     } else if (error instanceof jwt.JsonWebTokenError) {
 *       throw new Error('Invalid token');
 *     }
 *     throw new Error('Token verification failed');
 *   }
 * }
 */

/**
 * Refresh access token using refresh token
 * 
 * Uncomment when jsonwebtoken is installed:
 * 
 * export function refreshAccessToken(refreshToken: string): string {
 *   const payload = verifyToken(refreshToken);
 *   
 *   if (payload.type !== 'refresh') {
 *     throw new Error('Invalid token type');
 *   }
 *   
 *   return generateAccessToken(payload.address, payload.chainId);
 * }
 */

/**
 * TEMPORARY: Base64 token functions (current implementation)
 * These should be replaced with JWT functions above when ready
 */

export function generateTemporaryToken(address: string): string {
  const token = Buffer.from(`${address}:${Date.now()}`).toString('base64');
  return token;
}

export function verifyTemporaryToken(token: string): { address: string; timestamp: number } {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [address, timestamp] = decoded.split(':');
    
    if (!address || !timestamp) {
      throw new Error('Invalid token format');
    }
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp || '0');
    if (tokenAge > 86400000) {
      throw new Error('Token expired');
    }
    
    return { address, timestamp: parseInt(timestamp) };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Token blacklist (for logout)
 * NOTE: In production, use Redis for distributed blacklist across multiple servers
 * Example: const redis = new Redis(process.env.REDIS_URL);
 *          await redis.setex(`blacklist:${token}`, 86400, '1');
 */
const tokenBlacklist = new Set<string>();

export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  
  // Remove expired tokens (tokens older than 24h)
  // In production, let Redis handle TTL automatically
  if (tokenBlacklist.size > 10000) {
    console.warn('[TokenBlacklist] Size exceeded 10000, clearing old tokens');
    // In a real implementation, we'd remove only expired tokens
    // For now, keep most recent 5000
    const recentTokens = Array.from(tokenBlacklist).slice(-5000);
    tokenBlacklist.clear();
    recentTokens.forEach(t => tokenBlacklist.add(t));
  }
}

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string {
  if (!authHeader) {
    throw new Error('No authorization header');
  }
  
  const [type, token] = authHeader.split(' ');
  
  if (type !== 'Bearer' || !token) {
    throw new Error('Invalid authorization header format');
  }
  
  return token;
}
