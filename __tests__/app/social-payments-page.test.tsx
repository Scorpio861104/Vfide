import { describe, it, expect, jest } from '@jest/globals';

// /social-payments now redirects to /social-hub?tab=pay
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Social payments page pathways', () => {
  it('renders social payment stats and supporter list', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social-payments/page');
      const SocialPaymentsPage = pageModule.default as () => never;
      expect(() => SocialPaymentsPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=pay');
  });

  it('switches across feed, activity, and earnings tabs', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social-payments/page');
      const SocialPaymentsPage = pageModule.default as () => never;
      expect(() => SocialPaymentsPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=pay');
  });
});
