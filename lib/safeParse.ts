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
      console.warn('[SafeParse] JSON parse failed:', error);
      console.warn('[SafeParse] Input:', jsonString?.substring(0, 100));
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
  } catch (error) {
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
