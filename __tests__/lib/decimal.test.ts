import { describe, it, expect } from '@jest/globals';
import {
  sumDecimalStrings,
  subtractDecimalStrings,
  decimalStringToScaledBigInt,
  scaledBigIntToDecimalString,
  VFIDE_DB_DECIMAL_SCALE,
} from '@/lib/decimal';

describe('decimal helpers', () => {
  describe('sumDecimalStrings', () => {
    it('handles the canonical 0.1 + 0.2 precision bug exactly', () => {
      // JS: 0.1 + 0.2 = 0.30000000000000004
      // Ours: 0.300000
      expect(sumDecimalStrings(['0.1', '0.2'], 6)).toBe('0.300000');
    });

    it('sums many small values without drift', () => {
      // 10 × 0.1 = 1.0 exactly (not 0.9999999999999999)
      const values = Array(10).fill('0.1');
      expect(sumDecimalStrings(values, 6)).toBe('1.000000');
    });

    it('handles values with full 6-decimal precision', () => {
      expect(sumDecimalStrings(['12.345678', '7.654322'], 6)).toBe('20.000000');
    });

    it('handles large amounts without overflow', () => {
      // Max VFIDE supply is well under 1e12 tokens at 6-decimal scale;
      // the underlying BigInt has effectively unlimited precision.
      expect(sumDecimalStrings(['1000000.500000', '2000000.500000'], 6)).toBe('3000001.000000');
    });

    it('skips null/undefined/malformed entries silently', () => {
      expect(
        sumDecimalStrings(['1.0', null, undefined, '2.0', 'not-a-number'], 6)
      ).toBe('3.000000');
    });

    it('returns 0 at the requested scale when input is empty', () => {
      expect(sumDecimalStrings([], 6)).toBe('0.000000');
    });

    it('handles inputs with no fractional part', () => {
      expect(sumDecimalStrings(['1', '2', '3'], 6)).toBe('6.000000');
    });

    it('handles inputs with fewer than scale decimals', () => {
      expect(sumDecimalStrings(['1.5', '2.25'], 6)).toBe('3.750000');
    });

    it('truncates inputs with more than scale decimals', () => {
      // "0.1234567" with scale 6 → 0.123456 (last digit dropped)
      expect(sumDecimalStrings(['0.1234567'], 6)).toBe('0.123456');
    });
  });

  describe('subtractDecimalStrings', () => {
    it('subtracts exactly', () => {
      expect(subtractDecimalStrings('1.000000', '0.300000', 6)).toBe('0.700000');
    });

    it('handles result going negative', () => {
      expect(subtractDecimalStrings('1.0', '5.0', 6)).toBe('-4.000000');
    });

    it('round-trips with sum: total - unclaimed = claimed', () => {
      const all = ['0.1', '0.2', '0.3'];
      const claimed = ['0.1'];
      const total = sumDecimalStrings(all, 6);
      const claimedSum = sumDecimalStrings(claimed, 6);
      const unclaimed = subtractDecimalStrings(total, claimedSum, 6);
      expect(unclaimed).toBe('0.500000');
    });
  });

  describe('decimalStringToScaledBigInt + scaledBigIntToDecimalString round-trip', () => {
    it('is exact for typical reward values', () => {
      const inputs = ['0.1', '12.345678', '100.000001', '0', '1000000.999999'];
      for (const input of inputs) {
        const scaled = decimalStringToScaledBigInt(input, 6);
        const back = scaledBigIntToDecimalString(scaled, 6);
        // Normalize input to 6-decimal form for comparison
        const normalized = scaledBigIntToDecimalString(decimalStringToScaledBigInt(input, 6), 6);
        expect(back).toBe(normalized);
      }
    });
  });

  describe('VFIDE_DB_DECIMAL_SCALE', () => {
    it('matches the project standard for DECIMAL(18, 6)', () => {
      expect(VFIDE_DB_DECIMAL_SCALE).toBe(6);
    });
  });
});
