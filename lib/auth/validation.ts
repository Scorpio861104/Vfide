/**
 * @file lib/auth/validation.ts
 *
 * Generic Zod-backed request validation helpers for Next.js App Router routes.
 *
 * Most production API routes inline their own zod validation today (see
 * `app/api/auth/route.ts`). These helpers are provided as a *consistent surface*
 * that test suites and future routes can depend on, so we don't have to repeat
 * the same parse-and-respond boilerplate.
 *
 * Return shape (intentionally union-like):
 *   - { success: true; data: T }
 *   - { success: false; error: string; details?: z.ZodIssue[]; response: NextResponse }
 *
 * The `response` field on the failure branch is a pre-built 400 response that
 * routes can return directly:
 *
 *   const result = await validateBody(request, schema);
 *   if (!result.success) return result.response;
 *   const { foo } = result.data;
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodTypeAny, ZodIssue, infer as ZInfer } from 'zod4';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
  details?: ZodIssue[];
  response: NextResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildErrorResponse(
  error: string,
  status: number,
  details?: ZodIssue[],
): NextResponse {
  return NextResponse.json(
    { error, ...(details ? { details } : {}) },
    { status },
  );
}

function fail(
  error: string,
  status: number,
  details?: ZodIssue[],
): ValidationFailure {
  return {
    success: false,
    error,
    ...(details ? { details } : {}),
    response: buildErrorResponse(error, status, details),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a JSON request body against a Zod schema.
 *
 * - Returns 400 on invalid JSON.
 * - Returns 400 on schema mismatch with `details` carrying ZodIssue[].
 * - Returns parsed `data` on success.
 */
export async function validateBody<S extends ZodTypeAny>(
  request: NextRequest | Request,
  schema: S,
): Promise<ValidationResult<ZInfer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail('Validation failed', 400, parsed.error.issues);
  }
  return { success: true, data: parsed.data as ZInfer<S> };
}

/**
 * Validate URL search-parameters against a Zod schema.
 *
 * Accepts either a `NextRequest` (uses `request.nextUrl.searchParams`) or a
 * `URLSearchParams` instance directly.
 */
export function validateQueryParams<S extends ZodTypeAny>(
  source: NextRequest | URLSearchParams,
  schema: S,
): ValidationResult<ZInfer<S>> {
  const params =
    source instanceof URLSearchParams
      ? source
      : (source as NextRequest).nextUrl.searchParams;

  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });

  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return fail('Invalid query parameters', 400, parsed.error.issues);
  }
  return { success: true, data: parsed.data as ZInfer<S> };
}

/**
 * Validate dynamic-segment params (e.g. `[id]`) against a Zod schema.
 */
export function validateParams<S extends ZodTypeAny>(
  params: Record<string, string | string[] | undefined>,
  schema: S,
): ValidationResult<ZInfer<S>> {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return fail('Invalid path parameters', 400, parsed.error.issues);
  }
  return { success: true, data: parsed.data as ZInfer<S> };
}

// ---------------------------------------------------------------------------
// Common reusable schemas
// ---------------------------------------------------------------------------

export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
export const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;

/** Minimal SIWE-style auth payload schema (matches `app/api/auth/route.ts`). */
export const authSchema = z.object({
  address: z.string().trim().regex(ADDRESS_PATTERN),
  message: z.string().min(1),
  signature: z.string().trim().regex(SIGNATURE_PATTERN),
});

/** Generic Ethereum address payload. */
export const addressSchema = z.object({
  address: z.string().trim().regex(ADDRESS_PATTERN),
});

export type AuthPayload = ZInfer<typeof authSchema>;
export type AddressPayload = ZInfer<typeof addressSchema>;
