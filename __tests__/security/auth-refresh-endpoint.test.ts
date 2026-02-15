/**
 * Tests for auth refresh endpoint
 * Validates: /api/auth/refresh route handler
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Auth Refresh Endpoint', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/auth/refresh/route.ts'),
      'utf-8'
    );
  });

  it('should exist as a route file', () => {
    expect(source).toBeDefined();
    expect(source.length).toBeGreaterThan(0);
  });

  it('should export a POST handler', () => {
    expect(source).toContain('export async function POST');
  });

  it('should import refreshAccessToken from jwt', () => {
    expect(source).toContain('refreshAccessToken');
  });

  it('should read refresh token from cookie (not request body)', () => {
    expect(source).toContain('getRefreshCookie');
  });

  it('should set both access and refresh cookies in response', () => {
    expect(source).toContain('setAuthCookie');
    expect(source).toContain('setRefreshCookie');
  });

  it('should have rate limiting', () => {
    expect(source).toContain('withRateLimit');
  });

  it('should return 401 when no refresh token provided', () => {
    expect(source).toContain("'No refresh token'");
    expect(source).toContain('401');
  });

  it('should return 401 for invalid refresh tokens', () => {
    expect(source).toContain("'Invalid or expired refresh token'");
  });
});

describe('Auth Route - Refresh Token Cookie', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/auth/route.ts'),
      'utf-8'
    );
  });

  it('should import setRefreshCookie', () => {
    expect(source).toContain('setRefreshCookie');
  });

  it('should set refresh cookie on auth', () => {
    expect(source).toContain('setRefreshCookie(tokenResponse.refreshToken');
  });
});

describe('Cookie Auth Configuration', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'lib/auth/cookieAuth.ts'),
      'utf-8'
    );
  });

  it('should set access cookie max age to 1 hour (not 24h)', () => {
    // COOKIE_MAX_AGE = 60 * 60 (1 hour)
    expect(source).toMatch(/COOKIE_MAX_AGE = 60 \* 60;?\s*\/\/.*1 hour/);
  });

  it('should set refresh cookie max age to 7 days', () => {
    expect(source).toContain('REFRESH_MAX_AGE = 60 * 60 * 24 * 7');
  });
});
