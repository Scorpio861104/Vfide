/**
 * @jest-environment jsdom
 */
import { calculateFeeFlowSplit } from '@/app/components/FeeFlowRiver';

describe('FeeFlowRiver split math', () => {
  it('splits every fee into all canonical pools instead of one weighted destination', () => {
    const split = calculateFeeFlowSplit(100);

    expect(split).toEqual({
      burn: 40,
      sanctum: 10,
      payroll: 25,
      merchant: 15,
      headhunt: 10,
    });
  });

  it('conserves cents after rounding', () => {
    const split = calculateFeeFlowSplit(8.37);
    const total = Object.values(split).reduce((acc, value) => acc + value, 0);

    expect(total).toBeCloseTo(8.37, 2);
    for (const value of Object.values(split)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});
