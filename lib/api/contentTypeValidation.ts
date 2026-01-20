/**
 * Content-Type Validation Utilities
 * 
 * Enforces correct Content-Type headers to prevent MIME confusion attacks
 * and ensure proper request parsing.
 * 
 * Security Benefits:
 * - Prevents MIME confusion attacks
 * - Ensures proper request parsing
 * - Clear error messages for wrong Content-Type
 * - Type-safe validation
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed Content-Type values
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  OCTET_STREAM: 'application/octet-stream',
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

/**
 * Content-Type requirements for different endpoint types
 */
export const ENDPOINT_CONTENT_TYPE_REQUIREMENTS: Record<string, ContentType[]> = {
  // File upload endpoints - allow multipart/form-data
  '/api/attachments/upload': [CONTENT_TYPES.FORM_DATA],
  
  // All other write endpoints default to JSON only
  default: [CONTENT_TYPES.JSON],
};

/**
 * Parse Content-Type header (extracts main type, ignoring charset and other parameters)
 * 
 * Examples:
 * - "application/json; charset=utf-8" -> "application/json"
 * - "multipart/form-data; boundary=..." -> "multipart/form-data"
 */
export function parseContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  
  // Split by semicolon and take the first part (the media type)
  const mainType = contentType.split(';')[0].trim().toLowerCase();
  return mainType;
}

/**
 * Get allowed Content-Types for a specific endpoint
 */
export function getAllowedContentTypes(pathname: string): ContentType[] {
  // Check if endpoint has specific requirements
  if (pathname in ENDPOINT_CONTENT_TYPE_REQUIREMENTS) {
    return ENDPOINT_CONTENT_TYPE_REQUIREMENTS[pathname];
  }
  
  // Check for wildcard patterns
  for (const [pattern, types] of Object.entries(ENDPOINT_CONTENT_TYPE_REQUIREMENTS)) {
    if (pattern !== 'default' && pathname.includes(pattern)) {
      return types;
    }
  }
  
  // Default to JSON only for API endpoints
  if (pathname.startsWith('/api/')) {
    return ENDPOINT_CONTENT_TYPE_REQUIREMENTS.default;
  }
  
  // Non-API endpoints have no restriction
  return [];
}

/**
 * Validate Content-Type header for write operations
 * 
 * @param request - Next.js request object
 * @returns null if valid, NextResponse with error if invalid
 */
export function validateContentType(request: NextRequest): NextResponse | null {
  const pathname = new URL(request.url).pathname;
  
  // Only validate write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return null;
  }
  
  // Get allowed content types for this endpoint
  const allowedTypes = getAllowedContentTypes(pathname);
  
  // If no restrictions, allow anything
  if (allowedTypes.length === 0) {
    return null;
  }
  
  // Get and parse the Content-Type header
  const contentTypeHeader = request.headers.get('content-type');
  const contentType = parseContentType(contentTypeHeader);
  
  // Missing Content-Type is an error for write operations
  if (!contentType) {
    return NextResponse.json(
      {
        error: 'Missing Content-Type header',
        message: `This endpoint requires one of the following Content-Type headers: ${allowedTypes.join(', ')}`,
        allowedContentTypes: allowedTypes,
      },
      {
        status: 415, // 415 Unsupported Media Type
        headers: {
          'Content-Type': 'application/json',
          'Accept': allowedTypes.join(', '),
        },
      }
    );
  }
  
  // Check if Content-Type is allowed
  if (!allowedTypes.includes(contentType as ContentType)) {
    return NextResponse.json(
      {
        error: 'Unsupported Content-Type',
        message: `Content-Type "${contentType}" is not supported for this endpoint`,
        receivedContentType: contentType,
        allowedContentTypes: allowedTypes,
      },
      {
        status: 415, // 415 Unsupported Media Type
        headers: {
          'Content-Type': 'application/json',
          'Accept': allowedTypes.join(', '),
        },
      }
    );
  }
  
  // Content-Type is valid
  return null;
}

/**
 * Helper function to enforce JSON Content-Type (for use in route handlers)
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const error = requireJSONContentType(request);
 *   if (error) return error;
 *   
 *   // Process request...
 * }
 * ```
 */
export function requireJSONContentType(request: NextRequest): NextResponse | null {
  const contentTypeHeader = request.headers.get('content-type');
  const contentType = parseContentType(contentTypeHeader);
  
  if (contentType !== CONTENT_TYPES.JSON) {
    return NextResponse.json(
      {
        error: 'Invalid Content-Type',
        message: 'This endpoint requires Content-Type: application/json',
        receivedContentType: contentType || 'none',
      },
      {
        status: 415,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );
  }
  
  return null;
}

/**
 * Check if request has JSON Content-Type
 */
export function hasJSONContentType(request: NextRequest): boolean {
  const contentType = parseContentType(request.headers.get('content-type'));
  return contentType === CONTENT_TYPES.JSON;
}

/**
 * Check if request has multipart/form-data Content-Type
 */
export function hasFormDataContentType(request: NextRequest): boolean {
  const contentType = parseContentType(request.headers.get('content-type'));
  return contentType === CONTENT_TYPES.FORM_DATA;
}
