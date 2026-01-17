/**
 * JWT Authentication
 * 
 * Handles JWT token generation, verification, and wallet signature validation.
 */

import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
);
const JWT_ALGORITHM = 'HS256';
const TOKEN_EXPIRY = '24h'; // 24 hours

export interface JWTPayload {
  userId: string;
  walletAddress: string;
  proofScore?: number;
  isMerchant?: boolean;
  isMentor?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
  
  return token;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<JWTPayload | null> {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}

/**
 * Verify wallet signature (for login/authentication)
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // TODO: Implement with ethers.js or viem
    // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    // return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    
    // Placeholder - always return false in development
    console.warn('Wallet signature verification not implemented');
    return false;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate authentication message for wallet signing
 */
export function generateAuthMessage(walletAddress: string, nonce: string): string {
  return `Welcome to VFIDE!

Sign this message to authenticate your wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${new Date().toISOString()}

This signature will not trigger any blockchain transaction or cost any gas fees.`;
}

/**
 * Role-based access control middleware
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole?: 'merchant' | 'mentor'
): Promise<{ user: JWTPayload } | { error: string; status: number }> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return {
      error: 'Authentication required',
      status: 401,
    };
  }
  
  // Check role if specified
  if (requiredRole === 'merchant' && !user.isMerchant) {
    return {
      error: 'Merchant access required',
      status: 403,
    };
  }
  
  if (requiredRole === 'mentor' && !user.isMentor) {
    return {
      error: 'Mentor access required',
      status: 403,
    };
  }
  
  return { user };
}
