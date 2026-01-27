/**
import { log } from '@/lib/logging';
 * CSRF Token API Endpoint
 * GET /api/csrf - Returns a CSRF token for the client to use in subsequent requests
 */

import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf';

export async function GET() {
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
    log.error('[CSRF API] Error generating token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate CSRF token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
