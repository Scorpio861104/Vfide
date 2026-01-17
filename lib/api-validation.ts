/**
 * API Request Validation Middleware
 * 
 * Provides structured validation for API endpoints with proper error responses.
 * Prevents injection attacks, invalid data, and ensures data integrity.
 * 
 * Usage in API routes:
 * ```typescript
 * import { validateRequest, schemas } from '@/lib/api-validation';
 * 
 * export async function POST(request: NextRequest) {
 *   const validation = await validateRequest(request, schemas.message);
 *   if (!validation.valid) {
 *     return validation.errorResponse;
 *   }
 *   const data = validation.data;
 *   // Use validated data safely
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { VALIDATION_CONFIG } from './config.constants';
import { validateAddress as validateEthAddress, sanitizeString } from './validation';

export class ApiValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

/**
 * Validation schema type
 */
export type ValidationSchema<T> = {
  [K in keyof T]: (value: unknown, allData?: Record<string, unknown>) => T[K];
};

/**
 * Validation result
 */
export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errorResponse: NextResponse };

/**
 * Validate address field
 */
function validateAddressField(value: unknown, fieldName = 'address'): string {
  if (typeof value !== 'string') {
    throw new ApiValidationError(`${fieldName} must be a string`, fieldName);
  }
  
  const result = validateEthAddress(value);
  if (!result.valid) {
    throw new ApiValidationError(result.error || 'Invalid address', fieldName);
  }
  
  return value.toLowerCase();
}

/**
 * Validate string field
 */
function validateStringField(
  value: unknown,
  fieldName: string,
  options: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): string {
  const {
    minLength = 0,
    maxLength = Infinity,
    required = true,
    pattern,
    allowEmpty = false,
  } = options;
  
  if (value === undefined || value === null || value === '') {
    if (required && !allowEmpty) {
      throw new ApiValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
    }
    return '';
  }
  
  if (typeof value !== 'string') {
    throw new ApiValidationError(`${fieldName} must be a string`, fieldName, 'TYPE_ERROR');
  }
  
  const sanitized = sanitizeString(value, maxLength);
  
  if (sanitized.length < minLength) {
    throw new ApiValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
      'MIN_LENGTH'
    );
  }
  
  if (sanitized.length > maxLength) {
    throw new ApiValidationError(
      `${fieldName} must be at most ${maxLength} characters`,
      fieldName,
      'MAX_LENGTH'
    );
  }
  
  if (pattern && !pattern.test(sanitized)) {
    throw new ApiValidationError(`${fieldName} has invalid format`, fieldName, 'PATTERN');
  }
  
  return sanitized;
}

/**
 * Validate number field
 */
function validateNumberField(
  value: unknown,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    integer?: boolean;
  } = {}
): number {
  const { min = -Infinity, max = Infinity, required = true, integer = false } = options;
  
  if (value === undefined || value === null) {
    if (required) {
      throw new ApiValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
    }
    return 0;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(num) || !isFinite(num)) {
    throw new ApiValidationError(`${fieldName} must be a valid number`, fieldName, 'TYPE_ERROR');
  }
  
  if (integer && !Number.isInteger(num)) {
    throw new ApiValidationError(`${fieldName} must be an integer`, fieldName, 'TYPE_ERROR');
  }
  
  if (num < min) {
    throw new ApiValidationError(`${fieldName} must be at least ${min}`, fieldName, 'MIN_VALUE');
  }
  
  if (num > max) {
    throw new ApiValidationError(`${fieldName} must be at most ${max}`, fieldName, 'MAX_VALUE');
  }
  
  return num;
}

/**
 * Validate boolean field
 */
function validateBooleanField(value: unknown, fieldName: string, required = true): boolean {
  if (value === undefined || value === null) {
    if (required) {
      throw new ApiValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
    }
    return false;
  }
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  
  throw new ApiValidationError(`${fieldName} must be a boolean`, fieldName, 'TYPE_ERROR');
}

/**
 * Common validation schemas
 */
export const schemas = {
  /**
   * Message creation/update schema
   */
  message: {
    conversationId: (v: unknown) => validateStringField(v, 'conversationId', { maxLength: 100 }),
    from: (v: unknown) => validateAddressField(v, 'from'),
    to: (v: unknown) => validateAddressField(v, 'to'),
    encryptedContent: (v: unknown) =>
      validateStringField(v, 'encryptedContent', {
        maxLength: VALIDATION_CONFIG.MAX_LENGTHS.MESSAGE,
      }),
    signature: (v: unknown) =>
      validateStringField(v, 'signature', { required: false, maxLength: 200 }),
  },

  /**
   * Friend request schema
   */
  friendRequest: {
    from: (v: unknown) => validateAddressField(v, 'from'),
    to: (v: unknown) => validateAddressField(v, 'to'),
  },

  /**
   * User profile update schema
   */
  userProfile: {
    username: (v: unknown) =>
      validateStringField(v, 'username', {
        required: false,
        maxLength: VALIDATION_CONFIG.MAX_LENGTHS.USERNAME,
        pattern: /^[a-zA-Z0-9_-]+$/,
      }),
    displayName: (v: unknown) =>
      validateStringField(v, 'displayName', {
        required: false,
        maxLength: VALIDATION_CONFIG.MAX_LENGTHS.DISPLAY_NAME,
      }),
    bio: (v: unknown) =>
      validateStringField(v, 'bio', {
        required: false,
        maxLength: VALIDATION_CONFIG.MAX_LENGTHS.BIO,
      }),
  },

  /**
   * Pagination parameters schema
   */
  pagination: {
    limit: (v: unknown) =>
      validateNumberField(v, 'limit', {
        required: false,
        min: 1,
        max: VALIDATION_CONFIG.MAX_LENGTHS.PROPOSAL_DESCRIPTION,
        integer: true,
      }) || 30,
    offset: (v: unknown) =>
      validateNumberField(v, 'offset', {
        required: false,
        min: 0,
        integer: true,
      }) || 0,
  },

  /**
   * XP award schema
   */
  xpAward: {
    address: (v: unknown) => validateAddressField(v, 'address'),
    amount: (v: unknown) =>
      validateNumberField(v, 'amount', {
        min: 1,
        max: 1000,
        integer: true,
      }),
    reason: (v: unknown) =>
      validateStringField(v, 'reason', {
        maxLength: 200,
      }),
  },
};

/**
 * Validate request body against schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ValidationSchema<T>
): Promise<ValidationResult<T>> {
  try {
    // Parse JSON body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return {
        valid: false,
        errorResponse: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        ),
      };
    }

    // Validate against schema
    const validated = {} as T;
    for (const key in schema) {
      try {
        validated[key] = schema[key](body[key], body);
      } catch (error) {
        if (error instanceof ApiValidationError) {
          return {
            valid: false,
            errorResponse: NextResponse.json(
              {
                error: error.message,
                field: error.field,
                code: error.code,
              },
              { status: 400 }
            ),
          };
        }
        throw error;
      }
    }

    return { valid: true, data: validated };
  } catch (error) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: 'Validation failed' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ValidationSchema<T>
): ValidationResult<T> {
  try {
    const params: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const validated = {} as T;
    for (const key in schema) {
      try {
        validated[key] = schema[key](params[key], params);
      } catch (error) {
        if (error instanceof ApiValidationError) {
          return {
            valid: false,
            errorResponse: NextResponse.json(
              {
                error: error.message,
                field: error.field,
                code: error.code,
              },
              { status: 400 }
            ),
          };
        }
        throw error;
      }
    }

    return { valid: true, data: validated };
  } catch (error) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: 'Query parameter validation failed' },
        { status: 500 }
      ),
    };
  }
}
