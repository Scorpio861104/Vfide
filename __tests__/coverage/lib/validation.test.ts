/**
 * Validation Utilities Tests
 */

import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateAddress,
  validateAmount,
  validateURL,
  validatePhoneNumber,
} from '../../../lib/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('first.last@sub.domain.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongP@ss123')).toBe(true);
      expect(validatePassword('C0mpl3x!Pass')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('password')).toBe(false);
    });

    it('should enforce minimum length', () => {
      expect(validatePassword('Short1!')).toBe(false);
      expect(validatePassword('LongEnough1!')).toBe(true);
    });

    it('should require special characters', () => {
      expect(validatePassword('NoSpecial123')).toBe(false);
      expect(validatePassword('Has$pecial123')).toBe(true);
    });

    it('should require numbers', () => {
      expect(validatePassword('NoNumbers!')).toBe(false);
      expect(validatePassword('HasNumbers1!')).toBe(true);
    });

    it('should require uppercase and lowercase', () => {
      expect(validatePassword('alllowercase1!')).toBe(false);
      expect(validatePassword('ALLUPPERCASE1!')).toBe(false);
      expect(validatePassword('MixedCase1!')).toBe(true);
    });
  });

  describe('validateUsername', () => {
    it('should validate valid usernames', () => {
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('test_user')).toBe(true);
      expect(validateUsername('user-name')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false); // too short
      expect(validateUsername('user@name')).toBe(false); // invalid char
      expect(validateUsername('user name')).toBe(false); // space
    });

    it('should enforce length limits', () => {
      expect(validateUsername('a'.repeat(2))).toBe(false);
      expect(validateUsername('a'.repeat(3))).toBe(true);
      expect(validateUsername('a'.repeat(30))).toBe(true);
      expect(validateUsername('a'.repeat(31))).toBe(false);
    });
  });

  describe('validateAddress', () => {
    it('should validate Ethereum addresses', () => {
      expect(validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(true);
      expect(validateAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(validateAddress('0x123')).toBe(false);
      expect(validateAddress('invalid')).toBe(false);
      expect(validateAddress('1234567890123456789012345678901234567890')).toBe(false);
    });

    it('should handle checksummed addresses', () => {
      expect(validateAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toBe(true);
    });

    it('should reject empty input', () => {
      expect(validateAddress('')).toBe(false);
      expect(validateAddress(null as any)).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive numbers', () => {
      expect(validateAmount('1')).toBe(true);
      expect(validateAmount('1.5')).toBe(true);
      expect(validateAmount('0.001')).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount('-1')).toBe(false);
      expect(validateAmount('0')).toBe(false);
      expect(validateAmount('abc')).toBe(false);
    });

    it('should handle decimal places', () => {
      expect(validateAmount('1.123456789012345678')).toBe(true);
    });

    it('should reject too many decimals', () => {
      expect(validateAmount('1.' + '1'.repeat(20), 18)).toBe(false);
    });

    it('should validate against max value', () => {
      expect(validateAmount('100', 18, '50')).toBe(false);
      expect(validateAmount('30', 18, '50')).toBe(true);
    });
  });

  describe('validateURL', () => {
    it('should validate correct URLs', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://test.org')).toBe(true);
      expect(validateURL('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateURL('not-a-url')).toBe(false);
      expect(validateURL('ftp://example.com')).toBe(false);
      expect(validateURL('//example.com')).toBe(false);
    });

    it('should require HTTPS', () => {
      expect(validateURL('http://example.com', { requireHTTPS: true })).toBe(false);
      expect(validateURL('https://example.com', { requireHTTPS: true })).toBe(true);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('+44 20 1234 5678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abcdefghij')).toBe(false);
    });

    it('should handle different formats', () => {
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
      expect(validatePhoneNumber('123-456-7890')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters', () => {
      expect(validateEmail('测试@example.com')).toBe(true);
      expect(validateUsername('user_名前')).toBe(true);
    });

    it('should handle very long inputs', () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      expect(validateEmail(longEmail)).toBe(true);
    });

    it('should handle special characters safely', () => {
      expect(validateUsername('user<script>')).toBe(false);
      expect(validatePassword('Pass<>123!')).toBe(true);
    });
  });

  describe('Custom Validators', () => {
    it('should support custom validation rules', () => {
      const customValidator = (value: string) => value.length > 5;
      expect(customValidator('test')).toBe(false);
      expect(customValidator('testing')).toBe(true);
    });
  });
});
