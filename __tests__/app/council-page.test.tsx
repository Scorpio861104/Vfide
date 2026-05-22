import { describe, it, expect, jest } from '@jest/globals';

// /council is a redirect-only page that forwards to /governance?tab=council.
// We assert the redirect is invoked with the correct path.

const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('/council page (redirect-only)', () => {
  it('redirects to /governance?tab=council', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pageModule = require('../../app/council/page');
    const CouncilRedirect = pageModule.default as () => unknown;
    expect(() => CouncilRedirect()).toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledWith('/governance?tab=council');
  });
});
