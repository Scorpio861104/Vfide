/**
 * Next.js Proxy for Security Headers, Request Size Limits, and Content-Type Validation
 *
 * This proxy:
 * 1. Adds nonce to CSP headers for inline scripts/styles
 * 2. Enforces request size limits to prevent DoS attacks
 * 3. Validates Content-Type headers to prevent MIME confusion attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateContentType } from './lib/api/contentTypeValidation';
import { buildCsp, generateNonce, asOrigin } from './lib/security/csp';
import { validateCSRF, generateCSRFToken, setCSRFTokenCookie } from './lib/security/csrf';

/**
 * Maximum request body sizes by endpoint type
 */
const MAX_BODY_SIZES = {
	// API routes - enforce strict limits
	api: {
		default: 100 * 1024, // 100KB for most API calls
		small: 10 * 1024, // 10KB for simple operations
		medium: 100 * 1024, // 100KB for messages, groups
		large: 1 * 1024 * 1024, // 1MB for file uploads
	},
	// Pages - no body size limits (GET requests)
	pages: Infinity,
};

function applySecurityHeaders(response: NextResponse, nonce: string, csp: string): NextResponse {
	response.headers.set('x-nonce', nonce);
	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	return response;
}

function applyCorsHeaders(response: NextResponse, corsOrigin: string | null): NextResponse {
	if (!corsOrigin) return response;

	response.headers.set('Access-Control-Allow-Origin', corsOrigin);
	response.headers.set('Access-Control-Allow-Credentials', 'true');
	response.headers.set('Vary', 'Origin');
	return response;
}

/**
 * Determine if the request origin is allowed for CORS.
 * Self-origin and configured app URLs are permitted.
 */
function getAllowedOrigin(origin: string | null): string | null {
	if (!origin) return null;

	const allowed = new Set<string>();

	// Always allow the configured app URL
	const appUrl = asOrigin(process.env.NEXT_PUBLIC_APP_URL);
	if (appUrl) allowed.add(appUrl);

	// Allow Vercel preview deployments only outside strict production runtime.
	// In production, require explicit preview environment semantics.
	if (origin.endsWith('.vercel.app')) {
		if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') {
			allowed.add(origin);
		}
	}

	// Allow localhost in development
	if (process.env.NODE_ENV !== 'production') {
		if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
			allowed.add(origin);
		}
	}

	return allowed.has(origin) ? origin : null;
}

/**
 * Get appropriate body size limit for the request
 */
function getBodySizeLimit(pathname: string): number {
	// Pages don't have body size limits
	if (!pathname.startsWith('/api')) {
		return MAX_BODY_SIZES.pages;
	}

	// Small payloads
	if (pathname.match(/\/(auth|balance|fees|price|health|leaderboard|friends)/)) {
		return MAX_BODY_SIZES.api.small;
	}

	// Large payloads (file uploads)
	if (pathname.includes('/attachments')) {
		return MAX_BODY_SIZES.api.large;
	}

	// Medium payloads (messages, groups, proposals)
	if (pathname.match(/\/(messages|groups|proposals|sync|errors)/)) {
		return MAX_BODY_SIZES.api.medium;
	}

	// Default for other API routes
	return MAX_BODY_SIZES.api.default;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} bytes`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function proxy(request: NextRequest) {
	const pathname = new URL(request.url).pathname;
	const nonce = generateNonce();
	const csp = buildCsp(nonce);
	const requestOrigin = request.headers.get('origin');
	const corsOrigin = pathname.startsWith('/api/')
		? getAllowedOrigin(requestOrigin)
		: null;

	if (pathname.startsWith('/api/') && requestOrigin && !corsOrigin) {
		const response = NextResponse.json(
			{
				error: 'Origin not allowed',
			},
			{ status: 403 }
		);
		return applySecurityHeaders(response, nonce, csp);
	}

	// --- CORS for API routes ---
	if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
		const preflightResponse = new NextResponse(null, { status: 204 });
		if (corsOrigin) {
			applyCorsHeaders(preflightResponse, corsOrigin);
		}
		preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
		preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
		preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
		preflightResponse.headers.set('Access-Control-Max-Age', '86400');
		return applySecurityHeaders(preflightResponse, nonce, csp);
	}

	// Check request body size for write operations (POST, PUT, PATCH, DELETE)
	if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
		const transferEncoding = request.headers.get('transfer-encoding');
		if (transferEncoding && transferEncoding.toLowerCase() !== 'identity') {
			const response = NextResponse.json(
				{ error: 'Transfer-Encoding is not supported for state-changing requests' },
				{ status: 400 }
			);
			return applyCorsHeaders(applySecurityHeaders(response, nonce, csp), corsOrigin);
		}

		const contentLength = request.headers.get('content-length');

		// Fail closed when body length is unknown to prevent chunked-body limit bypass.
		if (!contentLength) {
			const response = NextResponse.json(
				{
					error: 'Content-Length header is required for state-changing requests',
				},
				{ status: 411 }
			);
			return applyCorsHeaders(applySecurityHeaders(response, nonce, csp), corsOrigin);
		}

		const bodySize = parseInt(contentLength, 10);
		if (isNaN(bodySize) || bodySize < 0) {
			const response = NextResponse.json(
				{
					error: 'Invalid Content-Length header',
				},
				{ status: 400 }
			);
			return applyCorsHeaders(applySecurityHeaders(response, nonce, csp), corsOrigin);
		}

		const maxSize = getBodySizeLimit(pathname);

		// Enforce size limit
		if (!isNaN(bodySize) && bodySize > maxSize) {
			const response = NextResponse.json(
				{
					error: 'Request payload too large',
					message: `Request size ${formatBytes(bodySize)} exceeds maximum allowed size of ${formatBytes(maxSize)}`,
					maxSize,
					receivedSize: bodySize,
				},
				{
					status: 413,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': '60',
					},
				}
			);
			return applyCorsHeaders(applySecurityHeaders(response, nonce, csp), corsOrigin);
		}

		// Validate Content-Type for write operations
		const contentTypeError = validateContentType(request);
		if (contentTypeError) {
			return applyCorsHeaders(applySecurityHeaders(contentTypeError, nonce, csp), corsOrigin);
		}

		// Validate CSRF token for state-changing operations
		const csrfError = validateCSRF(request);
		if (csrfError) {
			return applyCorsHeaders(applySecurityHeaders(csrfError, nonce, csp), corsOrigin);
		}
	}

	// Pass nonce into downstream request headers for app/layout.tsx
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set('x-nonce', nonce);

	const response = applySecurityHeaders(NextResponse.next({
		request: { headers: requestHeaders },
	}), nonce, csp);

	// Ensure a CSRF token cookie exists for subsequent state-changing API requests.
	if (!request.cookies.get('csrf_token')?.value) {
		setCSRFTokenCookie(response, generateCSRFToken());
	}

	// Attach CORS headers for API responses
	applyCorsHeaders(response, corsOrigin);

	return response;
}

// Compatibility export for older middleware import paths.
export const middleware = proxy;

export const config = {
	matcher: [
		'/api/:path*',
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
	],
};
