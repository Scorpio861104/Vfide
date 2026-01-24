/**
 * Validation Utilities Tests
 */

import {
  validateAddress,
  validateEmail,
  safeParseInt,
  safeParseFloat,
  validateNumberRange,
  sanitizeString,
  safeArrayAccess,
  ensureArray,
} from '../../../lib/validation';

describe('Validation Utilities', () => {
  describe('validateAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const result = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
      expect(result.valid).toBe(true);
    });

    it('should validate full length addresses', () => {
      const result = validateAddress('0x1234567890123456789012345678901234567890');
      expect(result.valid).toBe(true);
    });

    it('should reject addresses without 0x prefix', () => {
      const result = validateAddress('1234567890123456789012345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0x');
    });

    it('should reject addresses that are too short', () => {
      const result = validateAddress('0x123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('42 characters');
    });

    it('should reject empty addresses', () => {
      const result = validateAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject null/undefined', () => {
      expect(validateAddress(null as any).valid).toBe(false);
      expect(validateAddress(undefined as any).valid).toBe(false);
    });

    it('should reject zero address by default', () => {
      const result = validateAddress('0x0000000000000000000000000000000000000000');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('zero address');
    });

    it('should allow zero address when option enabled', () => {
      const result = validateAddress('0x0000000000000000000000000000000000000000', { allowZeroAddress: true });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('user@domain.co.uk').valid).toBe(true);
      expect(validateEmail('first.last@sub.domain.com').valid).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
    });

    it('should reject empty input', () => {
      expect(validateEmail('').valid).toBe(false);
      expect(validateEmail(null as any).valid).toBe(false);
      expect(validateEmail(undefined as any).valid).toBe(false);
    });

    it('should return error message', () => {
      const result = validateEmail('invalid');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid');
    });
  });

  describe('safeParseInt', () => {
    it('should parse valid integers', () => {
      expect(safeParseInt('42')).toBe(42);
      expect(safeParseInt('0')).toBe(0);
      expect(safeParseInt('-5')).toBe(-5);
    });

    it('should return default for invalid input', () => {
      expect(safeParseInt('abc')).toBe(0);
      expect(safeParseInt('')).toBe(0);
      expect(safeParseInt(null)).toBe(0);
      expect(safeParseInt(undefined)).toBe(0);
    });

    it('should use custom default value', () => {
      expect(safeParseInt('abc', 10)).toBe(10);
    });

    it('should enforce min/max bounds', () => {
      expect(safeParseInt('5', 0, { min: 10 })).toBe(10);
      expect(safeParseInt('100', 0, { max: 50 })).toBe(50);
    });

    it('should handle number input', () => {
      expect(safeParseInt(42)).toBe(42);
    });
  });

  describe('safeParseFloat', () => {
    it('should parse valid floats', () => {
      expect(safeParseFloat('3.14')).toBe(3.14);
      expect(safeParseFloat('0.5')).toBe(0.5);
    });

    it('should return default for invalid input', () => {
      expect(safeParseFloat('abc')).toBe(0);
      expect(safeParseFloat('')).toBe(0);
    });

    it('should enforce bounds', () => {
      expect(safeParseFloat('0.5', 0, { min: 1 })).toBe(1);
      expect(safeParseFloat('10', 0, { max: 5 })).toBe(5);
    });
  });

  describe('validateNumberRange', () => {
    it('should validate numbers in range', () => {
      expect(validateNumberRange(5, 0, 10).valid).toBe(true);
      expect(validateNumberRange(0, 0, 10).valid).toBe(true);
      expect(validateNumberRange(10, 0, 10).valid).toBe(true);
    });

    it('should reject numbers out of range', () => {
      expect(validateNumberRange(-1, 0, 10).valid).toBe(false);
      expect(validateNumberRange(11, 0, 10).valid).toBe(false);
    });

    it('should reject NaN', () => {
      expect(validateNumberRange(NaN, 0, 10).valid).toBe(false);
    });

    it('should reject Infinity', () => {
      expect(validateNumberRange(Infinity, 0, 10).valid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should enforce max length', () => {
      const result = sanitizeString('a'.repeat(100), 10);
      expect(result.length).toBe(10);
    });

    it('should handle null/undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

  describe('safeArrayAccess', () => {
    it('should access valid indices', () => {
      const arr = [1, 2, 3];
      expect(safeArrayAccess(arr, 0, 0)).toBe(1);
      expect(safeArrayAccess(arr, 2, 0)).toBe(3);
    });

    it('should return default for out of bounds', () => {
      const arr = [1, 2, 3];
      expect(safeArrayAccess(arr, 10, 99)).toBe(99);
      expect(safeArrayAccess(arr, -1, 99)).toBe(99);
    });

    it('should return default for null/undefined array', () => {
      expect(safeArrayAccess(null, 0, 99)).toBe(99);
      expect(safeArrayAccess(undefined, 0, 99)).toBe(99);
    });
  });

  describe('ensureArray', () => {
    it('should return array as-is', () => {
      const arr = [1, 2, 3];
      expect(ensureArray(arr)).toBe(arr);
    });

    it('should return default for null/undefined', () => {
      expect(ensureArray(null)).toEqual([]);
      expect(ensureArray(undefined)).toEqual([]);
    });

    it('should use custom default', () => {
      expect(ensureArray(null, [1, 2])).toEqual([1, 2]);
    });
  });
});
