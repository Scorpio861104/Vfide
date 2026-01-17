import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { randomBytes, createHmac } from 'crypto';
import { authLogger } from '@/lib/logger.service';
import { AUTH_CONFIG } from '@/lib/config.constants';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const { MAX_ATTEMPTS, WINDOW_MS } = AUTH_CONFIG.RATE_LIMIT;

/**
 * Simple rate limiting check
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Generate a secure session token with HMAC
 */
function generateSecureToken(address: string): string {
  const timestamp = Date.now().toString();
  const randomSalt = randomBytes(16).toString('hex');
  const payload = `${address}:${timestamp}:${randomSalt}`;
  
  // In production, use a secure secret from environment variables
  const secret = process.env.SESSION_SECRET || 'change-this-in-production';
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * POST /api/auth
 * Authenticate user with wallet signature
 */
export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const clientId = address.toLowerCase();
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify the signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Generate secure session token with HMAC
    const sessionToken = generateSecureToken(address);

    // In production, store session in Redis/database with proper expiration
    // For now, just return the token
    return NextResponse.json({
      success: true,
      token: sessionToken,
      address,
      expiresIn: AUTH_CONFIG.SESSION_EXPIRY_MS / 1000, // Return in seconds
    });
  } catch (error) {
    // Log error securely without exposing sensitive details
    authLogger.error('Authentication failed');
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Verify token HMAC signature
 */
function verifyToken(token: string): { valid: boolean; address?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');
    
    if (parts.length !== 4) {
      return { valid: false };
    }
    
    const [address, timestamp, randomSalt, providedSignature] = parts;
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp || '0');
    if (tokenAge > AUTH_CONFIG.SESSION_EXPIRY_MS || tokenAge < 0) {
      return { valid: false };
    }
    
    // Verify HMAC signature
    const secret = process.env.SESSION_SECRET || 'change-this-in-production';
    const hmac = createHmac('sha256', secret);
    hmac.update(`${address}:${timestamp}:${randomSalt}`);
    const expectedSignature = hmac.digest('hex');
    
    if (expectedSignature !== providedSignature) {
      return { valid: false };
    }
    
    return { valid: true, address };
  } catch {
    return { valid: false };
  }
}

/**
 * GET /api/auth/verify
 * Verify session token
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const verification = verifyToken(token);
    
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      address: verification.address,
    });
  } catch (error) {
    authLogger.error('Token verification failed');
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}
