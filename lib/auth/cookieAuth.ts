/**
 * HTTPOnly Cookie Authentication Migration
 * 
 * Provides utilities to migrate from localStorage tokens to httpOnly cookies
 * for improved XSS protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

// Cookie configuration
const AUTH_COOKIE_NAME = 'vfide_auth_token';
const REFRESH_COOKIE_NAME = 'vfide_refresh_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Set authentication token in httpOnly cookie
 */
export async function setAuthCookie(token: string, response?: NextResponse): Promise<void> {
  const options: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };

  if (response) {
    // Set cookie in response
    response.cookies.set(AUTH_COOKIE_NAME, token, options);
  } else {
    // Set cookie directly (server-side only)
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, options);
  }
}

/**
 * Set refresh token in httpOnly cookie
 */
export async function setRefreshCookie(refreshToken: string, response?: NextResponse): Promise<void> {
  const options: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_MAX_AGE,
    path: '/',
  };

  if (response) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, options);
  } else {
    const cookieStore = await cookies();
    cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, options);
  }
}

/**
 * Get authentication token from httpOnly cookie
 */
export async function getAuthCookie(request?: NextRequest): Promise<string | null> {
  if (request) {
    // Get from request
    return request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  } else {
    // Get from cookies() (server-side only)
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
  }
}

/**
 * Get refresh token from httpOnly cookie
 */
export async function getRefreshCookie(request?: NextRequest): Promise<string | null> {
  if (request) {
    return request.cookies.get(REFRESH_COOKIE_NAME)?.value || null;
  } else {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_COOKIE_NAME)?.value || null;
  }
}

/**
 * Clear all authentication cookies
 */
export async function clearAuthCookies(response?: NextResponse): Promise<void> {
  const options: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  };

  if (response) {
    response.cookies.set(AUTH_COOKIE_NAME, '', options);
    response.cookies.set(REFRESH_COOKIE_NAME, '', options);
  } else {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, '', options);
    cookieStore.set(REFRESH_COOKIE_NAME, '', options);
  }
}

/**
 * Check if auth cookies are set (useful for migration detection)
 */
export async function hasAuthCookies(request?: NextRequest): Promise<boolean> {
  const token = await getAuthCookie(request);
  return token !== null;
}

/**
 * Migrate from localStorage to httpOnly cookies
 * This endpoint should be called by the client to complete migration
 */
export async function migrateToHttpOnlyCookies(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, refreshToken } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided for migration' },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Token migrated to httpOnly cookies',
    });

    // Set tokens in httpOnly cookies
    await setAuthCookie(token, response);
    
    if (refreshToken) {
      await setRefreshCookie(refreshToken, response);
    }

    return response;
  } catch (error) {
    logger.error('[Cookie Auth] Migration error:', error as Error);
    return NextResponse.json(
      { error: 'Failed to migrate tokens' },
      { status: 500 }
    );
  }
}

/**
 * Helper to create authenticated API response with updated cookie
 */
export function createAuthenticatedResponse(
  data: Record<string, unknown>,
  token?: string,
  refreshToken?: string
): NextResponse {
  const response = NextResponse.json(data);

  if (token) {
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });
  }

  return response;
}
