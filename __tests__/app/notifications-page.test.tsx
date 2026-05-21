import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockDismissNotification = jest.fn();
const mockClearNotifications = jest.fn();
const mockUpdatePreference = jest.fn();
const mockResetPreferences = jest.fn();
const mockExportNotifications = jest.fn((format: 'json' | 'csv') =>
  format === 'json' ? '{"ok":true}' : 'id,type\n1,payment'
);
const mockSearchNotifications = jest.fn();
const mockFilterNotifications = jest.fn();

const notifications = [
  { id: '1', title: 'Payment received', status: 'unread', type: 'payment' },
  { id: '2', title: 'Governance update', status: 'read', type: 'governance' },
];

const originalCreateElement = document.createElement.bind(document);

const renderNotificationsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/notifications/page');
  const NotificationsPage = pageModule.default as React.ComponentType;
  return render(<NotificationsPage />);
};

jest.mock('@/hooks/useNotificationHub', () => ({
  useNotificationHub: () => ({
    notifications,
    stats: { unread: 1, total: 2 },
    isLoading: false,
    filterNotifications: mockFilterNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    dismissNotification: mockDismissNotification,
    clearNotifications: mockClearNotifications,
    preferences: { email: true },
    updatePreference: mockUpdatePreference,
    resetPreferences: mockResetPreferences,
    exportNotifications: mockExportNotifications,
    searchNotifications: mockSearchNotifications,
  }),
}));

jest.mock('@/config/notification-hub', () => ({
  NotificationType: {
    payment: 'payment',
    governance: 'governance',
    social: 'social',
  },
}));

jest.mock('@/components/notifications/NotificationList', () => ({
  NotificationList: ({ notifications: list }: { notifications: Array<{ id: string }> }) => (
    <div>Notification List ({list.length})</div>
  ),
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
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
};
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

jest.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Notifications page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSearchNotifications.mockImplementation((query: string) => {
      return notifications.filter((n) => n.title.toLowerCase().includes(query.toLowerCase()));
    });
    mockFilterNotifications.mockImplementation((filter: { types?: string[] }) => {
      if (!filter.types?.length) return notifications;
      return notifications.filter((n) => filter.types?.includes(n.type));
    });

    Object.defineProperty(global, 'Blob', {
      configurable: true,
      writable: true,
      value: function BlobMock(this: any, parts: unknown[], options: Record<string, unknown>) {
        this.parts = parts;
        this.options = options;
      },
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(() => 'blob:mock-url'),
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });

    jest.restoreAllMocks();
  });

  it('renders all tab content with stats and unread controls', () => {
    renderNotificationsPage();

    expect(screen.getAllByRole('heading', { name: /Notification Command/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Notification Stats Component')).toBeTruthy();
    expect(screen.getByText(/1 unread signals/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mark All as Read/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Clear All/i })).toBeTruthy();
    expect(screen.getByText(/Notification List \(2\)/i)).toBeTruthy();
  });

  it('applies search and type filter interactions', () => {
    renderNotificationsPage();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'payment' },
    });
    expect(mockSearchNotifications).toHaveBeenCalledWith('payment');

    fireEvent.change(screen.getByDisplayValue('All Types'), {
      target: { value: 'payment' },
    });
    expect(mockFilterNotifications).toHaveBeenCalled();
  });

  it('switches to preferences tab and triggers exports', () => {
    const clickSpy = jest.fn();
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        Object.defineProperty(anchor, 'click', {
          configurable: true,
          writable: true,
          value: clickSpy,
        });
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    renderNotificationsPage();

    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    expect(screen.getByText('Notification Preferences Component')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /JSON/i }));
    fireEvent.click(screen.getByRole('button', { name: /CSV/i }));
    expect(mockExportNotifications).toHaveBeenCalledWith('json');
    expect(mockExportNotifications).toHaveBeenCalledWith('csv');
  });
});