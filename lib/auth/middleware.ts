/**
 * Authentication Middleware for API Routes
 * Provides secure authentication and authorization checks.
 *
 * The auth/authz GUARDS (requireAuth, requireAdmin, requireOwnership, verifyAuth,
 * checkOwnership, isAdmin, verifyOnChainAdmin, optionalAuth, getRequestAuthToken) now
 * live in ./apiGuards and are re-exported here, so existing `@/lib/auth/middleware`
 * imports across the API routes are unchanged. The guards were moved out because
 * next/jest's SWC transformer mangles the exports of any file named `middleware.ts`
 * (see apiGuards.ts). This file retains the request-handler wrappers (withAuth /
 * withOwnership), which compose those guards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload } from './jwt';
import { requireAuth, requireOwnership } from './apiGuards';

// Re-export the guards + shared types so existing `@/lib/auth/middleware` importers
// (including `import type { AuthResult } from '@/lib/auth/middleware'`) keep working.
export * from './apiGuards';

type AuthenticatedHandlerNoContext<T = Promise<Response>> = (
  request: NextRequest,
  user: JWTPayload
) => T;

type AuthenticatedHandlerWithContext<TCtx = unknown, T = Promise<Response>> = (
  request: NextRequest,
  user: JWTPayload,
  context: TCtx
) => T;

type OwnershipExtractor<TCtx = unknown> = (
  request: NextRequest,
  context: TCtx
) => string | Promise<string>;

type OwnershipHandler<TCtx = unknown, T = Promise<NextResponse>> = (
  request: NextRequest,
  user: JWTPayload,
  context: TCtx
) => T;

/**
 * Wrap an API handler and require authentication before invoking it.
 */
export function withAuth(handler: AuthenticatedHandlerNoContext): (request: NextRequest) => Promise<Response>;
export function withAuth<TCtx>(handler: AuthenticatedHandlerWithContext<TCtx>): (request: NextRequest, context: TCtx) => Promise<Response>;
export function withAuth(handler: unknown) {
  return async (request: NextRequest, context?: unknown): Promise<Response> => {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { runWithDbUserAddressContext } = await import('@/lib/db');
    return runWithDbUserAddressContext(authResult.user.address, () =>
      (handler as AuthenticatedHandlerWithContext<unknown> | AuthenticatedHandlerNoContext)(request, authResult.user, context as never)
    );
  };
}

/**
 * Wrap an API handler and require ownership of a target address before invoking it.
 * Supports route handlers that accept an additional context argument (e.g. params).
 */
export function withOwnership<TCtx = unknown>(
  extractAddress: OwnershipExtractor<TCtx>,
  handler: OwnershipHandler<TCtx>
) {
  return async (request: NextRequest, context: TCtx): Promise<NextResponse> => {
    let targetAddress: string;
    try {
      const extracted = await extractAddress(request, context);
      targetAddress = (extracted ?? '').trim().toLowerCase();
    } catch {
      return NextResponse.json(
        { error: 'Invalid ownership target' },
        { status: 400 }
      );
    }

    if (!targetAddress) {
      return NextResponse.json(
        { error: 'Invalid ownership target' },
        { status: 400 }
      );
    }

    const authResult = await requireOwnership(request, targetAddress);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { runWithDbUserAddressContext } = await import('@/lib/db');
    return runWithDbUserAddressContext(authResult.user.address, () =>
      handler(request, authResult.user, context)
    );
  };
}
