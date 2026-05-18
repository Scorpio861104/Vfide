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

jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('@/lib/errorMonitoring', () => ({
  errorMonitor: {
    captureError: jest.fn(),
  },
}));

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