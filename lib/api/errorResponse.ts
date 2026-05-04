import { NextResponse } from 'next/server';
import { handleErrorWithLogging } from '@/lib/security/errorSanitizer';

/**
 * Returns a sanitized JSON error response for API routes, ensuring raw
 * error.message values are never leaked to clients (P2-M-13 remediation).
 */
export function apiError(error: unknown, context?: string, status = 500): NextResponse {
  const message = handleErrorWithLogging(error, context);
  return NextResponse.json({ error: message }, { status });
}
