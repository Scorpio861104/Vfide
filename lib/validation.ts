/**
 * Input Validation and Sanitization Utilities
 * Prevents NaN propagation, type errors, and silent failures
 */

import { formatUnits, isAddress as viemIsAddress } from 'viem';
import { ZERO_ADDRESS } from '@/lib/constants';

// ==================== NUMERIC VALIDATION ====================

/**
 * Safely parse integer with validation
 * @param value - Value to parse
 * @param defaultValue - Default if parsing fails
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Parsed integer or default
 */
export function safeParseInt(
  value: string | number | undefined | null,
  defaultValue = 0,
  options?: { min?: number; max?: number }
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Check bounds
  if (options?.min !== undefined && parsed < options.min) {
    return options.min;
  }
  if (options?.max !== undefined && parsed > options.max) {
    return options.max;
  }

  return parsed;
}

/**
 * Safely parse float with validation
 * @param value - Value to parse
 * @param defaultValue - Default if parsing fails
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Parsed float or default
 */
export function safeParseFloat(
  value: string | number | undefined | null,
  defaultValue = 0,
  options?: { min?: number; max?: number }
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Check bounds
  if (options?.min !== undefined && parsed < options.min) {
    return options.min;
  }
  if (options?.max !== undefined && parsed > options.max) {
    return options.max;
  }

  return parsed;
}

/**
 * Safely convert BigInt to Number with precision check
 * Throws if value would lose precision
 * @param value - BigInt to convert
 * @param decimals - Decimal places (default 18 for ETH)
 * @returns Number representation
 */
export function safeBigIntToNumber(
  value: bigint | undefined | null,
  decimals = 18
): number {
  if (value === undefined || value === null) {
    return 0;
  }

  // IMPORTANT:
  // Token amounts are commonly represented as very large BigInts (e.g. 833e18).
  // Checking the *raw* BigInt against MAX_SAFE_INTEGER is incorrect when
  // decimals > 0, because the human-readable number may still be small/safe.
  const formatted = formatUnits(value, decimals);
  const asNumber = Number(formatted);

  if (!isFinite(asNumber) || isNaN(asNumber)) {
    return 0;
  }

  // Guard against genuinely huge magnitudes.
  if (Math.abs(asNumber) > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      `BigInt value ${value} exceeds safe Number range after scaling. Use formatUnits() (string) instead.`
    );
  }

  return asNumber;
}

/**
 * Validate numeric input is within range
 * @param value - Value to validate
 * @param min - Minimum allowed
 * @param max - Maximum allowed
 * @returns Validation result with error message
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (isNaN(value) || !isFinite(value)) {
    return { valid: false, error: 'Invalid number' };
  }

  if (value < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }

  if (value > max) {
    return { valid: false, error: `Value must be at most ${max}` };
  }

  return { valid: true };
}

// ==================== ADDRESS VALIDATION ====================

/**
 * Validate Ethereum address with user-friendly error
 * @param address - Address to validate
 * @returns Validation result with error message
 */
export function validateAddress(
  address: string | undefined | null,
  options?: { allowZeroAddress?: boolean }
): { valid: boolean; error?: string } {
  if (!address || address.trim() === '') {
    return { valid: false, error: 'Address is required' };
  }

  // Check format
  if (!address.startsWith('0x')) {
    return { valid: false, error: 'Address must start with 0x' };
  }

  if (address.length !== 42) {
    return { valid: false, error: 'Address must be 42 characters (0x + 40 hex chars)' };
  }

  // Validate with viem
  if (!viemIsAddress(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' };
  }

  // Check not zero address
  if (address === ZERO_ADDRESS) {
    if (!options?.allowZeroAddress) {
      return { valid: false, error: 'Cannot use zero address' };
    }
  }

  return { valid: true };
}

/**
 * Safely get address or throw error
 * @param address - Address to validate
 * @param fieldName - Field name for error message
 * @returns Validated address
 * @throws Error if invalid
 */
export function requireValidAddress(
  address: string | undefined | null,
  fieldName = 'Address'
): `0x${string}` {
  const validation = validateAddress(address);
  
  if (!validation.valid) {
    throw new Error(`${fieldName}: ${validation.error}`);
  }

  return address as `0x${string}`;
}

// ==================== STRING VALIDATION ====================

/**
 * Validate email address
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateEmail(
  email: string | undefined | null
): { valid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Sanitize string input (remove dangerous characters)
 * @param input - Input to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string | undefined | null,
  maxLength = 1000
): string {
  if (!input) return '';

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// ==================== ARRAY VALIDATION ====================

/**
 * Safely access array with bounds checking
 * @param array - Array to access
 * @param index - Index to access
 * @param defaultValue - Default if out of bounds
 * @returns Array element or default
 */
export function safeArrayAccess<T>(
  array: T[] | undefined | null,
  index: number,
  defaultValue: T
): T {
  if (!array || !Array.isArray(array)) {
    return defaultValue;
  }

  if (index < 0 || index >= array.length) {
    return defaultValue;
  }

  const value = array[index];
  return value !== undefined ? value : defaultValue;
}

/**
 * Ensure value is array
 * @param value - Value to check
 * @param defaultValue - Default empty array
 * @returns Array
 */
export function ensureArray<T>(
  value: T[] | undefined | null,
  defaultValue: T[] = []
): T[] {
  if (!value || !Array.isArray(value)) {
    return defaultValue;
  }
  return value;
}

// ==================== AMOUNT VALIDATION ====================

/**
 * Validate token amount string
 * @param amount - Amount string to validate
 * @param decimals - Token decimals
 * @returns Validation result
 */
export function validateTokenAmount(
  amount: string | undefined | null,
  decimals = 18
): { valid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Amount is required' };
  }

  const parsed = parseFloat(amount);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, error: 'Invalid amount format' };
  }

  if (parsed <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Check decimal places don't exceed token decimals
  const decimalPlaces = (amount.split('.')[1] || '').length;
  if (decimalPlaces > decimals) {
    return { valid: false, error: `Maximum ${decimals} decimal places allowed` };
  }

  return { valid: true };
}

// ==================== TIME VALIDATION ====================

/**
 * Validate timestamp is in reasonable range
 * @param timestamp - Unix timestamp in seconds
 * @returns Validation result
 */
export function validateTimestamp(
  timestamp: number | bigint | undefined | null
): { valid: boolean; error?: string } {
  if (timestamp === undefined || timestamp === null) {
    return { valid: false, error: 'Timestamp is required' };
  }

  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;

  // Reasonable range: 2020 to 2050
  const MIN_TIMESTAMP = 1577836800; // Jan 1, 2020
  const MAX_TIMESTAMP = 2524608000; // Jan 1, 2050

  if (ts < MIN_TIMESTAMP) {
    return { valid: false, error: 'Timestamp is too far in the past' };
  }

  if (ts > MAX_TIMESTAMP) {
    return { valid: false, error: 'Timestamp is too far in the future' };
  }

  return { valid: true };
}

/**
 * Safe Date conversion from timestamp
 * @param timestamp - Unix timestamp (seconds or milliseconds)
 * @param isMilliseconds - Whether timestamp is in milliseconds
 * @returns Date object or null if invalid
 */
export function safeTimestampToDate(
  timestamp: number | bigint | undefined | null,
  isMilliseconds = false
): Date | null {
  if (timestamp === undefined || timestamp === null) {
    return null;
  }

  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const ms = isMilliseconds ? ts : ts * 1000;

  const date = new Date(ms);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}
