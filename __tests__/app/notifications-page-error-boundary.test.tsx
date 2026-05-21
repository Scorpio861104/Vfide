import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockFilterNotifications = jest.fn();
const mockSearchNotifications = jest.fn();

let shouldThrowNotificationList = false;

const notifications = [
  { id: '1', title: 'Payment received', status: 'unread', type: 'payment' },
];

const renderNotificationsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/notifications/page');
  const NotificationsPage = pageModule.default as React.ComponentType;
  return render(<NotificationsPage />);
};

jest.mock('@/hooks/useNotificationHub', () => ({
  useNotificationHub: () => ({
    notifications,
    stats: { unread: 1, total: 1 },
    isLoading: false,
    filterNotifications: mockFilterNotifications,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    dismissNotification: jest.fn(),
    clearNotifications: jest.fn(),
    preferences: { email: true },
    updatePreference: jest.fn(),
    resetPreferences: jest.fn(),
    exportNotifications: jest.fn(() => '[]'),
    searchNotifications: mockSearchNotifications,
  }),
}));

jest.mock('@/config/notification-hub', () => ({
  NotificationType: {
    payment: 'payment',
    governance: 'governance',
  },
}));

jest.mock('@/components/notifications/NotificationList', () => ({
  NotificationList: () => {
    if (shouldThrowNotificationList) {
      throw new Error('Notification list render failure');
    }
    return <div>Notification List</div>;
  },
}));

jest.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => <div>Notification Preferences Component</div>,
}));

jest.mock('@/components/notifications/NotificationStats', () => ({
  NotificationStats: () => <div>Notification Stats Component</div>,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ children, title }: { children?: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock('framer-motion', () => {
  /* FRAMER_MOTION_MOCK_V1 */
  const React = require('react');
  // Reusable component that strips motion-only props and renders the underlying tag.
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onPan',
    'onPanStart', 'onPanEnd', 'onTap', 'onTapStart', 'onTapCancel',
    'onHoverStart', 'onHoverEnd', 'onDrag', 'onDragStart', 'onDragEnd',
    'onDirectionLock', 'onViewportEnter', 'onViewportLeave',
    'viewport', 'custom', 'transformTemplate', 'inherit',
  ]);
  const __makeMotion = (tag) => React.forwardRef((props, ref) => {
    const sanitized = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({}, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    MotionConfig: ({ children }) => children,
    Reorder: { Group: ({ children }) => children, Item: ({ children }) => children },
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollX: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollXProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useMotionValue: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useTransform: (v) => ({ get: () => 0, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});;

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const Icon = ({ className }: { className?: string }) => {
    const React = require('react');
    return React.createElement('span', { className }, 'icon');
  };
  const __orig: Record<string, any> = {};
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})());

// Note: @/lib/errorMonitoring is no longer used by the notifications error boundary.

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Notifications page error boundary handling', () => {
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    shouldThrowNotificationList = false;
    console.error = jest.fn();
    mockSearchNotifications.mockImplementation(() => notifications);
    mockFilterNotifications.mockImplementation(() => notifications);
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('contains notification list render failures behind the route boundary', async () => {
    shouldThrowNotificationList = true;

    renderNotificationsPage();

    expect((await screen.findAllByRole('heading', { name: /Notification Command/i })).length).toBeGreaterThan(0);
    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
    expect(screen.getByText(/Notification list render failure/i)).toBeTruthy();
  });
});