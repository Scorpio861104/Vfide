/**
 * Property-based testing with fast-check for price calculations
 * Tests invariants that should hold for all possible inputs
 */

import fc from 'fast-check';
import { formatPrice, parsePrice } from '@/lib/price-utils';

describe('Price Calculation Fuzzing', () => {
  describe('formatPrice invariants', () => {
    it('should always return a string', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1e15, noNaN: true }),
          (price) => {
            const result = formatPrice(price);
            expect(typeof result).toBe('string');
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle zero correctly', () => {
      fc.assert(
        fc.property(fc.constant(0), (price) => {
          const result = formatPrice(price);
          expect(result).toBe('$0.00');
        })
      );
    });

    it('should always include decimal separator for USD', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 1e6, noNaN: true }),
          (price) => {
            const result = formatPrice(price, 'USD');
            expect(result).toMatch(/\d+\.\d{2}/);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('parsePrice invariants', () => {
    it('should parse formatted prices back to numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1e6, noNaN: true }),
          (originalPrice) => {
            const formatted = formatPrice(originalPrice);
            const parsed = parsePrice(formatted);
            // Allow small floating point differences
            expect(Math.abs(parsed - originalPrice)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should handle various number formats', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 0, max: 99 }),
          (dollars, cents) => {
            const input = `${dollars}.${cents.toString().padStart(2, '0')}`;
            const parsed = parsePrice(input);
            expect(parsed).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(parsed)).toBe(true);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Round-trip consistency', () => {
    it('format -> parse -> format should be consistent', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 1e6, noNaN: true }),
          (price) => {
            const formatted1 = formatPrice(price);
            const parsed = parsePrice(formatted1);
            const formatted2 = formatPrice(parsed);
            expect(formatted1).toBe(formatted2);
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Edge cases discovered by fuzzing', () => {
    it('should handle very small numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 0.01, noNaN: true }),
          (price) => {
            const result = formatPrice(price);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle very large numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1e12, max: 1e15, noNaN: true }),
          (price) => {
            const result = formatPrice(price);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
            expect(result).not.toContain('Infinity');
          }
        ),
        { numRuns: 1000 }
      );
    });
  });
});
