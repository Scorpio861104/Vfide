/**
 * Unit tests for social system helper functions
 * Note: These tests require vitest to be installed
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { addNotification } from '../../components/social/SocialNotifications';
import { addActivity } from '../../components/social/ActivityFeed';

const mockLoggerError = jest.fn();

jest.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let throwOnGet = false;
  let throwOnSet = false;

  return {
    getItem: (key: string) => {
      if (throwOnGet) throw new Error('SecurityError');
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      if (throwOnSet) throw new Error('QuotaExceededError');
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    __setThrowOnGet: (value: boolean) => {
      throwOnGet = value;
    },
    __setThrowOnSet: (value: boolean) => {
      throwOnSet = value;
    },
  };
})();

jest.mock('@/lib/utils', () => ({
  safeLocalStorage: {
    getItem: (key: string) => localStorageMock.getItem(key),
    setItem: (key: string, value: string) => {
      localStorageMock.setItem(key, value);
      return true;
    },
    removeItem: (key: string) => {
      localStorageMock.removeItem(key);
      return true;
    },
  },
}));

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('addNotification', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    localStorageMock.__setThrowOnGet(false);
    localStorageMock.__setThrowOnSet(false);
    mockLoggerError.mockReset();
  });

  it('should add a notification to localStorage', () => {
    addNotification(testAddress, {
      type: 'message',
      from: '0xabcd',
      title: 'Test Notification',
      message: 'This is a test',
    });

    const stored = localStorage.getItem(`vfide_notifications_${testAddress}`);
    expect(stored).toBeTruthy();

    const notifications = JSON.parse(stored!);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'message',
      from: '0xabcd',
      title: 'Test Notification',
      message: 'This is a test',
      read: false,
    });
    expect(notifications[0]).toHaveProperty('id');
    expect(notifications[0]).toHaveProperty('timestamp');
  });

  it('should add multiple notifications', () => {
    addNotification(testAddress, {
      type: 'message',
      from: '0xabcd',
      title: 'First',
      message: 'First message',
    });

    addNotification(testAddress, {
      type: 'friend_request',
      from: '0xefgh',
      title: 'Second',
      message: 'Second message',
    });

    const stored = localStorage.getItem(`vfide_notifications_${testAddress}`);
    const notifications = JSON.parse(stored!);
    expect(notifications).toHaveLength(2);
    expect(notifications[0].title).toBe('Second'); // Most recent first
    expect(notifications[1].title).toBe('First');
  });

  it('should limit notifications to 50', () => {
    // Add 55 notifications
    for (let i = 0; i < 55; i++) {
      addNotification(testAddress, {
        type: 'message',
        from: '0xabcd',
        title: `Notification ${i}`,
        message: `Message ${i}`,
      });
    }

    const stored = localStorage.getItem(`vfide_notifications_${testAddress}`);
    const notifications = JSON.parse(stored!);
    expect(notifications).toHaveLength(50);
    expect(notifications[0].title).toBe('Notification 54'); // Most recent
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.__setThrowOnSet(true);

    // Should not throw
    expect(() => {
      addNotification(testAddress, {
        type: 'message',
        from: '0xabcd',
        title: 'Test',
        message: 'Test',
      });
    }).not.toThrow();

    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('should not modify state when localStorage throws on getItem', () => {
    localStorageMock.__setThrowOnGet(true);

    expect(() => {
      addNotification(testAddress, {
        type: 'message',
        from: '0xabcd',
        title: 'Test',
        message: 'Test',
      });
    }).not.toThrow();

    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('addActivity', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    localStorageMock.__setThrowOnGet(false);
    localStorageMock.__setThrowOnSet(false);
    mockLoggerError.mockReset();
  });

  it('should add an activity to localStorage', () => {
    addActivity(testAddress, {
      type: 'message',
      user: '0xabcd',
      content: 'Sent a message',
    });

    const stored = localStorage.getItem(`vfide_activity_feed_${testAddress}`);
    expect(stored).toBeTruthy();

    const activities = JSON.parse(stored!);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      type: 'message',
      user: '0xabcd',
      content: 'Sent a message',
    });
    expect(activities[0]).toHaveProperty('id');
    expect(activities[0]).toHaveProperty('timestamp');
  });

  it('should add multiple activities', () => {
    addActivity(testAddress, {
      type: 'payment',
      user: '0xabcd',
      content: 'Sent payment',
    });

    addActivity(testAddress, {
      type: 'endorsement',
      user: '0xefgh',
      content: 'Endorsed user',
    });

    const stored = localStorage.getItem(`vfide_activity_feed_${testAddress}`);
    const activities = JSON.parse(stored!);
    expect(activities).toHaveLength(2);
    expect(activities[0].type).toBe('endorsement'); // Most recent first
    expect(activities[1].type).toBe('payment');
  });

  it('should limit activities to 100', () => {
    // Add 110 activities
    for (let i = 0; i < 110; i++) {
      addActivity(testAddress, {
        type: 'message',
        user: '0xabcd',
        content: `Activity ${i}`,
      });
    }

    const stored = localStorage.getItem(`vfide_activity_feed_${testAddress}`);
    const activities = JSON.parse(stored!);
    expect(activities).toHaveLength(100);
    expect(activities[0].content).toBe('Activity 109'); // Most recent
  });

  it('should handle different activity types', () => {
    const types = ['message', 'payment', 'endorsement', 'friend_added', 'badge_earned', 'group_joined'] as const;

    types.forEach(type => {
      addActivity(testAddress, {
        type,
        user: '0xabcd',
        content: `${type} activity`,
      });
    });

    const stored = localStorage.getItem(`vfide_activity_feed_${testAddress}`);
    const activities = JSON.parse(stored!);
    expect(activities).toHaveLength(6);
  });

  it('should handle metadata', () => {
    addActivity(testAddress, {
      type: 'payment',
      user: '0xabcd',
      content: 'Sent payment',
      metadata: {
        amount: '100',
        token: 'VFIDE',
        txHash: '0x123',
      },
    });

    const stored = localStorage.getItem(`vfide_activity_feed_${testAddress}`);
    const activities = JSON.parse(stored!);
    expect(activities[0].metadata).toEqual({
      amount: '100',
      token: 'VFIDE',
      txHash: '0x123',
    });
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.__setThrowOnSet(true);

    expect(() => {
      addActivity(testAddress, {
        type: 'message',
        user: '0xabcd',
        content: 'Test',
      });
    }).not.toThrow();

    expect(mockLoggerError).toHaveBeenCalled();
  });
});
