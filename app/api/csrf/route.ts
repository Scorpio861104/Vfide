/**
 * CSRF Token API Endpoint
 * GET /api/csrf - Returns a CSRF token for the client to use in subsequent requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

function isAllowedCsrfRequest(request: NextRequest): boolean {
  const requestOrigin = request.nextUrl.origin;
  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;

  const allowlist = new Set<string>([requestOrigin]);
  if (configuredOrigin) {
    try {
      allowlist.add(new URL(configuredOrigin).origin);
    } catch {
      // Ignore malformed env values and keep runtime-origin allowlist.
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowlist.add('http://localhost:3000');
    allowlist.add('http://127.0.0.1:3000');
  }

  if (originHeader) {
    try {
      return allowlist.has(new URL(originHeader).origin);
    } catch {
      return false;
    }
  }

  if (refererHeader) {
    try {
      return allowlist.has(new URL(refererHeader).origin);
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== 'production';
}

export async function GET(request: NextRequest) {
  // Rate limiting to prevent token generation attacks
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  if (!isAllowedCsrfRequest(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

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
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('[CSRF API] Error generating token:', error);
    // Don't expose internal error details
    return NextResponse.json(
      {
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
