/**
 * Input Validation Utilities
 * Centralized validation functions for API endpoints
 */

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate and sanitize address (returns lowercase)
 */
export function validateAddress(address: string | null): string {
  if (!address) {
    throw new Error('Address is required');
  }
  
  if (!isValidAddress(address)) {
    throw new Error('Invalid Ethereum address format');
  }
  
  return address.toLowerCase();
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(value: string | null, fieldName: string): number {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = parseInt(value);
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  if (num < 0) {
    throw new Error(`${fieldName} must be positive`);
  }
  
  return num;
}

/**
 * Validate integer within range
 */
export function validateIntegerInRange(
  value: string | null,
  fieldName: string,
  min: number,
  max: number
): number {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = validatePositiveInteger(value, fieldName);
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  
  return num;
}

/**
 * Validate pagination limit (1-100)
 */
export function validateLimit(limit: string | null): number {
  if (!limit) return 50; // Default
  return validateIntegerInRange(limit, 'limit', 1, 100);
}

/**
 * Validate pagination offset
 */
export function validateOffset(offset: string | null): number {
  if (!offset) return 0; // Default
  return validatePositiveInteger(offset, 'offset');
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string | null,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (!allowedValues.includes(value as T)) {
    throw new Error(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  
  return value as T;
}

/**
 * Validate optional enum value
 */
export function validateOptionalEnum<T extends string>(
  value: string | null,
  allowedValues: readonly T[]
): T | undefined {
  if (!value) return undefined;
  
  if (!allowedValues.includes(value as T)) {
    throw new Error(
      `Value must be one of: ${allowedValues.join(', ')}`
    );
  }
  
  return value as T;
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string | null,
  fieldName: string,
  minLength: number,
  maxLength: number
): string {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (value.length < minLength || value.length > maxLength) {
    throw new Error(
      `${fieldName} must be between ${minLength} and ${maxLength} characters`
    );
  }
  
  return value;
}

/**
 * Validate optional string length
 */
export function validateOptionalStringLength(
  value: string | null,
  maxLength: number
): string | undefined {
  if (!value) return undefined;
  
  if (value.length > maxLength) {
    throw new Error(`Value must not exceed ${maxLength} characters`);
  }
  
  return value;
}

/**
 * Validate timestamp (Unix milliseconds)
 */
export function validateTimestamp(timestamp: string | null, fieldName: string): number {
  if (!timestamp) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = parseInt(timestamp);
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid timestamp`);
  }
  
  // Check if timestamp is reasonable (between 2020 and 2050)
  const minTimestamp = new Date('2020-01-01').getTime();
  const maxTimestamp = new Date('2050-01-01').getTime();
  
  if (num < minTimestamp || num > maxTimestamp) {
    throw new Error(`${fieldName} must be a valid timestamp`);
  }
  
  return num;
}

/**
 * Sanitize text input
 * Removes null bytes and control characters (except newlines, tabs, carriage returns)
 * This prevents injection attacks and ensures clean text storage
 */
export function sanitizeText(text: string): string {
  // Remove: null bytes (x00), and control chars (x01-x08, x0B-x0C, x0E-x1F, x7F)
  // Keep: tab (x09), newline (x0A), carriage return (x0D)
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate boolean parameter
 */
export function validateBoolean(value: string | null): boolean | undefined {
  if (!value) return undefined;
  
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  
  throw new Error('Value must be a boolean (true/false)');
}

/**
 * Create consistent error response
 */
export function createErrorResponse(error: Error | string, status: number = 400) {
  const message = error instanceof Error ? error.message : error;
  
  return {
    error: message,
    status,
    timestamp: new Date().toISOString(),
  };
}
