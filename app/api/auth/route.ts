import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { trackQuestEvent, trackDailyLogin } from '@/lib/questEvents';

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

    // Generate session token (in production, use JWT)
    const sessionToken = Buffer.from(`${address}:${Date.now()}`).toString('base64');

    // Track wallet connection and daily login (don't await to not block response)
    trackQuestEvent({
      userAddress: address,
      eventType: 'wallet_connected',
    }).catch(err => console.error('Failed to track wallet connection:', err));

    trackDailyLogin(address).catch(err => console.error('Failed to track daily login:', err));

    // In production, store session in Redis/database
    // For now, just return the token
    return NextResponse.json({
      success: true,
      token: sessionToken,
      address,
      expiresIn: 86400, // 24 hours
    });
  } catch (error) {
    console.error('[Auth API] Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
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

    // Decode and verify token
    const decoded = Buffer.from(token, 'base64').toString();
    const [address, timestamp] = decoded.split(':');

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp || '0');
    if (tokenAge > 86400000) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      address,
    });
  } catch (error) {
    console.error('[Auth Verify API] Error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}
