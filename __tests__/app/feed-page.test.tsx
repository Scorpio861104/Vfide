import { describe, it, expect, jest } from '@jest/globals';

// /feed is a redirect-only page that forwards to /social-hub.
// We assert the redirect is invoked with the correct path.

const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('/feed page (redirect-only)', () => {
  it('redirects to /social-hub', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/feed/page');
      const FeedPage = pageModule.default as () => unknown;
      expect(() => FeedPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub');
  });
});
