import { describe, it, expect, jest } from '@jest/globals';

// /dao-hub is a redirect-only page that forwards to /governance?tab=dao.
// We assert the redirect is invoked with the correct path.

const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('/dao-hub page (redirect-only)', () => {
  it('redirects to /governance?tab=dao', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pageModule = require('../../app/dao-hub/page');
    const DaoHubRedirect = pageModule.default as () => unknown;
    expect(() => DaoHubRedirect()).toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledWith('/governance?tab=dao');
  });
});
