/**
 * API Response Optimization Utilities
 * 
 * Utilities for optimizing API responses:
 * - Response compression
 * - Pagination helpers
 * - Data transformation
 * - Response caching headers
 * - Partial response (field filtering)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Pagination configuration and helpers
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Parse pagination parameters from request
 * Enforces reasonable limits to prevent abuse
 */
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const cursor = searchParams.get('cursor') || undefined;

  return { page, limit, cursor };
}

/**
 * Create paginated response with metadata
 * Provides consistent pagination structure
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  nextCursor?: string,
  prevCursor?: string
): PaginatedResponse<T> {
  const pages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
      nextCursor,
      prevCursor,
    },
  };
}

/**
 * Add caching headers to response
 * Improves performance by enabling browser/CDN caching
 */
export function addCacheHeaders(
  response: NextResponse,
  options: {
    maxAge?: number; // seconds
    sMaxAge?: number; // CDN cache seconds
    staleWhileRevalidate?: number;
    immutable?: boolean;
    private?: boolean;
  } = {}
): NextResponse {
  const {
    maxAge = 60,
    sMaxAge = 300,
    staleWhileRevalidate = 60,
    immutable = false,
    private: isPrivate = false,
  } = options;

  const cacheDirectives = [
    isPrivate ? 'private' : 'public',
    `max-age=${maxAge}`,
    `s-maxage=${sMaxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
    immutable ? 'immutable' : '',
  ].filter(Boolean).join(', ');

  response.headers.set('Cache-Control', cacheDirectives);
  
  return response;
}

/**
 * Add ETags for conditional requests
 * Reduces bandwidth by allowing 304 Not Modified responses
 */
export function addETag(response: NextResponse, content: string): NextResponse {
  // Simple hash-based ETag
  const hash = simpleHash(content);
  response.headers.set('ETag', `"${hash}"`);
  
  return response;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if client has fresh cached version
 * Returns true if ETag matches (304 can be sent)
 */
export function checkETag(request: NextRequest, etag: string): boolean {
  const clientETag = request.headers.get('if-none-match');
  return clientETag === `"${etag}"`;
}

/**
 * Field filtering for partial responses
 * Reduces payload size by returning only requested fields
 * 
 * @example
 * // Request: /api/users?fields=id,username,avatar
 * const filtered = filterFields(user, ['id', 'username', 'avatar']);
 */
export function filterFields<T extends Record<string, any>>(
  data: T,
  fields?: string[]
): Partial<T> {
  if (!fields || fields.length === 0) {
    return data;
  }

  const filtered: any = {};
  fields.forEach(field => {
    if (field in data) {
      filtered[field] = data[field];
    }
  });

  return filtered;
}

/**
 * Parse fields parameter from request
 */
export function parseFieldsParam(request: NextRequest): string[] | undefined {
  const { searchParams } = new URL(request.url);
  const fieldsParam = searchParams.get('fields');
  
  return fieldsParam ? fieldsParam.split(',').map(f => f.trim()) : undefined;
}

/**
 * Optimize response size by removing null/undefined values
 * Reduces payload size
 */
export function removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = removeEmptyValues(value);
      } else {
        cleaned[key] = value;
      }
    }
  });

  return cleaned;
}

/**
 * Create optimized JSON response
 * Combines caching, ETags, and compression hints
 */
export function createOptimizedResponse<T>(
  data: T,
  options: {
    status?: number;
    cache?: Parameters<typeof addCacheHeaders>[1];
    useETag?: boolean;
    removeEmpty?: boolean;
  } = {}
) {
  const {
    status = 200,
    cache,
    useETag = true,
    removeEmpty = true,
  } = options;

  // Process data
  let processedData = data;
  if (removeEmpty) {
    processedData = removeEmptyValues(data as any) as T;
  }

  const jsonString = JSON.stringify(processedData);
  const response = new NextResponse(jsonString, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add caching headers
  if (cache) {
    addCacheHeaders(response, cache);
  }

  // Add ETag
  if (useETag) {
    addETag(response, jsonString);
  }

  return response;
}

/**
 * Response compression hints
 * Tells reverse proxy to compress response
 */
export function addCompressionHints(response: NextResponse): NextResponse {
  // Vary header tells caches to serve different versions based on Accept-Encoding
  response.headers.set('Vary', 'Accept-Encoding');
  
  return response;
}

/**
 * Create 304 Not Modified response
 * Saves bandwidth when content hasn't changed
 */
export function create304Response(): NextResponse {
  return new NextResponse(null, { status: 304 });
}

/**
 * Batch API helper
 * Allows multiple API calls in single request
 * 
 * @example
 * POST /api/batch
 * {
 *   "requests": [
 *     { "id": "1", "path": "/api/users/me" },
 *     { "id": "2", "path": "/api/vault" }
 *   ]
 * }
 */
export interface BatchRequest {
  id: string;
  path: string;
  method?: string;
  body?: any;
}

export interface BatchResponse {
  id: string;
  status: number;
  data?: any;
  error?: string;
}

/**
 * Sort and paginate array data
 * Common operation for API responses
 */
export function sortAndPaginate<T>(
  data: T[],
  sortKey: keyof T,
  sortOrder: 'asc' | 'desc' = 'desc',
  page: number = 1,
  limit: number = 20
): { items: T[]; total: number } {
  // Sort
  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = sorted.slice(start, end);

  return {
    items,
    total: data.length,
  };
}
