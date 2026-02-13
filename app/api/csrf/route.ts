/**
 * CSRF Token API Endpoint
 * GET /api/csrf - Returns a CSRF token for the client to use in subsequent requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting to prevent token generation attacks
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  try {
    // Generate a new CSRF token
    const token = generateCSRFToken();

    // Create response with token
    const response = NextResponse.json(
      {
        token,
        message: 'CSRF token generated successfully',
      },
      { status: 200 }
    );

    // Set token in secure cookie
    response.cookies.set('csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[CSRF API] Error generating token:', error);
    // Don't expose internal error details
    return NextResponse.json(
      {
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
