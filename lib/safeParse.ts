import { logger } from '@/lib/logger';
/**
 * Safe JSON parsing utilities to prevent application crashes from malformed JSON
 * Addresses Critical Issue #4: Wrap all JSON.parse in try-catch
 */

export interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Safely parse JSON with a fallback value
 * @param jsonString The JSON string to parse
 * @param fallback The fallback value if parsing fails
 * @param logErrors Whether to log errors (default: true in development)
 * @returns Parsed data or fallback value
 */
export function safeJSONParse<T>(
  jsonString: string | null | undefined,
  fallback: T,
  logErrors = process.env.NODE_ENV === 'development'
): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed as T;
  } catch (error) {
    if (logErrors) {
      logger.warn('[SafeParse] JSON parse failed:', error);
      logger.warn('[SafeParse] Input:', jsonString?.substring(0, 100));
    }
    return fallback;
  }
}

/**
 * Parse JSON with detailed result information
 * @param jsonString The JSON string to parse
 * @returns Result object with success status and data/error
 */
export function safeJSONParseWithResult<T>(
  jsonString: string | null | undefined
): SafeParseResult<T> {
  if (!jsonString) {
    return {
      success: false,
      error: new Error('Empty or null JSON string')
    };
  }

  try {
    const data = JSON.parse(jsonString) as T;
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Parse JSON from localStorage safely
 * @param key localStorage key
 * @param fallback Fallback value
 * @returns Parsed value or fallback
 */
export function safeLocalStorageParse<T>(
  key: string,
  fallback: T
): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const item = localStorage.getItem(key);
    return safeJSONParse(item, fallback, false);
  } catch (_error) {
    // localStorage access might fail in some browsers
    return fallback;
  }
}

/**
 * Parse JSON array safely
 * @param jsonString The JSON string to parse
 * @param fallback Fallback array (default: empty array)
 * @returns Parsed array or fallback
 */
export function safeJSONParseArray<T>(
  jsonString: string | null | undefined,
  fallback: T[] = []
): T[] {
  const result = safeJSONParse(jsonString, fallback);
  return Array.isArray(result) ? result : fallback;
}

/**
 * Parse JSON object safely
 * @param jsonString The JSON string to parse
 * @param fallback Fallback object (default: empty object)
 * @returns Parsed object or fallback
 */
export function safeJSONParseObject<T extends Record<string, any>>(
  jsonString: string | null | undefined,
  fallback: T = {} as T
): T {
  const result = safeJSONParse(jsonString, fallback);
  return typeof result === 'object' && result !== null && !Array.isArray(result)
    ? result
    : fallback;
}

/**
 * Safely parse an integer with validation
 * @param value The string value to parse
 * @param fallback The fallback value if parsing fails or produces NaN
 * @param options Optional constraints (min, max)
 * @returns Parsed integer or fallback
 */
export function safeParseInt(
  value: string | null | undefined,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  if (!value) {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return fallback;
  }

  // Apply constraints
  let result = parsed;
  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }
  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  return result;
}

/**
 * Safely parse a float with validation
 * @param value The string value to parse
 * @param fallback The fallback value if parsing fails or produces NaN
 * @param options Optional constraints (min, max, allowNegative)
 * @returns Parsed float or fallback
 */
export function safeParseFloat(
  value: string | null | undefined,
  fallback: number,
  options?: { min?: number; max?: number; allowNegative?: boolean }
): number {
  if (!value) {
    return fallback;
  }

  const parsed = parseFloat(value);
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return fallback;
  }

  // Check negative constraint
  if (options?.allowNegative === false && parsed < 0) {
    return fallback;
  }

  // Apply constraints
  let result = parsed;
  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }
  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  return result;
}

/**
 * Safely convert a number or string to number with validation
 * @param value The value to convert
 * @param fallback The fallback value if conversion fails
 * @returns Converted number or fallback
 */
export function safeToNumber(
  value: unknown,
  fallback: number
): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  return num;
}

/**
 * Parse pagination parameters safely
 * @param limit Limit string from query params
 * @param offset Offset string from query params
 * @param defaults Default values and max constraints
 * @returns Safe pagination values
 */
export function safeParsePagination(
  limit: string | null | undefined,
  offset: string | null | undefined,
  defaults: { limit?: number; maxLimit?: number } = {}
): { limit: number; offset: number } {
  const defaultLimit = defaults.limit ?? 50;
  const maxLimit = defaults.maxLimit ?? 1000;

  return {
    limit: safeParseInt(limit, defaultLimit, { min: 1, max: maxLimit }),
    offset: safeParseInt(offset, 0, { min: 0 })
  };
}
