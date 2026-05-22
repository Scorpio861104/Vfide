import { describe, it, expect, jest } from '@jest/globals';

// The /notifications page now simply redirects to /settings?tab=notifications
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

describe('Notifications page redirect', () => {
  it('redirects to /settings?tab=notifications', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pageModule = require('../../app/notifications/page');
      const NotificationsPage = pageModule.default as () => never;
      expect(() => NotificationsPage()).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/settings?tab=notifications');
  });
});
