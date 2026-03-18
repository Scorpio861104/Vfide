import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockRefreshMetrics = jest.fn();
const mockRefreshPageMetrics = jest.fn();
const mockTrackEvent = jest.fn();
const mockResolveError = jest.fn();
const mockClearErrors = jest.fn();

const renderPerformancePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/performance/page');
  const PerformancePage = pageModule.default as React.ComponentType;
  return render(<PerformancePage />);
};

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

jest.mock('@/hooks/usePerformanceMetrics', () => ({
  usePerformanceMetrics: () => ({
    metrics: { lcp: 1200, fid: 20, cls: 0.02 },
    systemMetrics: {},
    isLoading: false,
    refreshMetrics: mockRefreshMetrics,
  }),
}));

jest.mock('@/hooks/useErrorTracking', () => ({
  useErrorTracking: () => ({
    errors: [{ id: 'e1', message: 'Error 1' }],
    errorStats: { unresolvedCount: 2 },
    addError: jest.fn(),
    resolveError: mockResolveError,
    clearErrors: mockClearErrors,
    exportErrors: () => '{"errors":[]}',
  }),
}));

jest.mock('@/hooks/useUserAnalytics', () => ({
  useUserAnalytics: () => ({
    analytics: { activeUsers: 42 },
    trackEvent: mockTrackEvent,
  }),
}));

jest.mock('@/hooks/usePagePerformance', () => ({
  usePagePerformance: () => ({
    pageMetrics: [{ id: 'p1' }],
    apiMetrics: [{ avgResponseTime: 120 }, { avgResponseTime: 180 }],
    refreshMetrics: mockRefreshPageMetrics,
  }),
}));

jest.mock('@/components/performance/PerformanceMetricsGrid', () => ({
  PerformanceMetricsGrid: () => <div>Performance Metrics Grid</div>,
}));

jest.mock('@/components/performance/ErrorTracker', () => ({
  ErrorTracker: () => <div>Error Tracker</div>,
}));

jest.mock('@/components/performance/UserAnalyticsDashboard', () => ({
  UserAnalyticsDashboard: () => <div>User Analytics Dashboard</div>,
}));

jest.mock('@/components/performance/PageMetricsDisplay', () => ({
  PageMetricsDisplay: () => <div>Page Metrics Display</div>,
}));

jest.mock('@/config/performance-dashboard', () => ({
  TimeRange: {
    LAST_HOUR: 'last_hour',
    LAST_24_HOURS: 'last_24_hours',
    LAST_7_DAYS: 'last_7_days',
    LAST_30_DAYS: 'last_30_days',
    LAST_90_DAYS: 'last_90_days',
  },
  calculateHealthScore: () => 88,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Performance page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders command header, health score, and overview cards', () => {
    renderPerformancePage();

    expect(screen.getAllByRole('heading', { name: /Performance Command/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/System Health Score/i)).toBeTruthy();
    expect(screen.getByText('88')).toBeTruthy();
    expect(screen.getByText(/Active Errors/i)).toBeTruthy();
    expect(screen.getByText(/Active Users/i)).toBeTruthy();
  });

  it('refreshes metrics and records tracking event', () => {
    renderPerformancePage();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    expect(mockRefreshMetrics).toHaveBeenCalled();
    expect(mockRefreshPageMetrics).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('switches tabs to errors, analytics, and pages content', () => {
    renderPerformancePage();

    fireEvent.click(screen.getByRole('button', { name: /Errors/i }));
    expect(screen.getByText(/Error Tracker/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Analytics/i }));
    expect(screen.getByText(/User Analytics Dashboard/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Pages/i }));
    expect(screen.getByText(/Page Metrics Display/i)).toBeTruthy();
  });
});
