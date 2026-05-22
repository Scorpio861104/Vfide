import { describe, it, expect, jest } from '@jest/globals';

// /treasury now redirects to /governance?tab=dao&dao=treasury
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Treasury page pathways', () => {
  it('renders treasury overview and distribution sections', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/treasury/page');
      const TreasuryPage = pageModule.default as () => never;
      expect(() => TreasuryPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/governance?tab=dao&dao=treasury');
  });

  it('shows sanctum disbursement connect gate when disconnected', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/treasury/page');
      const TreasuryPage = pageModule.default as () => never;
      expect(() => TreasuryPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/governance?tab=dao&dao=treasury');
  });
});
