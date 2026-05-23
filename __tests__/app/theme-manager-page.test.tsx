import { describe, it, expect, jest } from '@jest/globals';

// The /theme-manager page now simply redirects to /theme (consolidated).
// Per components/navigation/navigationItems.ts: "T1-4: Theme merged — one
// entry for /theme (the canonical theme page)". The route is preserved as
// a redirect shim so back-links and bookmarks still work.

const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Theme manager page (redirect shim)', () => {
  it('redirects to /theme', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/theme-manager/page');
      const ThemeManagerPage = pageModule.default as () => never;
      expect(() => ThemeManagerPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/theme');
  });
});
