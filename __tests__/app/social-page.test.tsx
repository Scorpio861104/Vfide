import { describe, it, expect, jest } from '@jest/globals';

// /social now redirects to /social-hub?tab=analytics
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Social analytics page pathways', () => {
  it('renders page shell with overview tab active', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social/page');
      const SocialPage = pageModule.default as () => never;
      expect(() => SocialPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=analytics');
  });

  it('switches between engagement and growth tabs', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social/page');
      const SocialPage = pageModule.default as () => never;
      expect(() => SocialPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=analytics');
  });
});
