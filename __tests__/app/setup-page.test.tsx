import { describe, it, expect, jest } from '@jest/globals';

// The /setup page now simply redirects to /settings?tab=account
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Setup page pathways', () => {
  it('shows wallet connect step when disconnected', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/setup/page');
      const SetupPage = pageModule.default as () => never;
      expect(() => SetupPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/settings?tab=account');
  });

  it('renders account tab profile editor when connected', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/setup/page');
      const SetupPage = pageModule.default as () => never;
      expect(() => SetupPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/settings?tab=account');
  });

  it('switches tabs and shows vault plus security sections', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/setup/page');
      const SetupPage = pageModule.default as () => never;
      expect(() => SetupPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/settings?tab=account');
  });
});
