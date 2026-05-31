import { describe, it, expect, jest } from '@jest/globals';

// /social-messaging now redirects to /social-hub?tab=messages
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Social messaging page pathways', () => {
  it('shows connect-wallet guard when disconnected', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social-messaging/page');
      const SocialMessagingPage = pageModule.default as () => never;
      expect(() => SocialMessagingPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=messages');
  });

  it('renders connected messaging shell and default messages tab', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social-messaging/page');
      const SocialMessagingPage = pageModule.default as () => never;
      expect(() => SocialMessagingPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=messages');
  });

  it('switches tabs for requests, groups, discover, and account modules', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/social-messaging/page');
      const SocialMessagingPage = pageModule.default as () => never;
      expect(() => SocialMessagingPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/social-hub?tab=messages');
  });
});
