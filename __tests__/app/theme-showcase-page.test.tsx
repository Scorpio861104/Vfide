import { describe, it, expect, jest } from '@jest/globals';

// The /theme-showcase page now simply redirects to /theme?tab=preview
// (consolidated). Per components/navigation/navigationItems.ts: "T1-4:
// Theme merged — one entry for /theme (the canonical theme page)". The
// route is preserved as a redirect shim so back-links and bookmarks
// still work.

const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Theme showcase page (redirect shim)', () => {
  it('redirects to /theme?tab=preview', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/theme-showcase/page');
      const ThemeShowcasePage = pageModule.default as () => never;
      expect(() => ThemeShowcasePage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/theme?tab=preview');
  });
});
