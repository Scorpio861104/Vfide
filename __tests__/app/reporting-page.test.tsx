import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockSetTimeRange = jest.fn();
const mockToggleAutoRefresh = jest.fn();
const mockRefreshReports = jest.fn();

const renderReportingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/reporting/page');
  const ReportingPage = pageModule.default as React.ComponentType;
  return render(<ReportingPage />);
};

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <>
      <h2>{title}</h2>
      {children}
    </>
  ),
}));

jest.mock('@/config/reporting-analytics', () => ({
  TimeRange: {
    LAST_24_HOURS: 'last_24_hours',
    LAST_7_DAYS: 'last_7_days',
  },
  ReportType: {
    FINANCIAL: 'financial',
    OPERATIONS: 'operations',
  },
  formatDateRange: (value: string) => value,
}));

jest.mock('@/hooks/useReportingAnalytics', () => ({
  useReportingAnalytics: () => ({
    reports: [
      {
        id: 'r1',
        title: 'Revenue Report',
        description: 'Revenue breakdown',
        metrics: [
          { id: 'm1', label: 'Volume', value: '1200' },
          { id: 'm2', label: 'Orders', value: '40' },
          { id: 'm3', label: 'Users', value: '15' },
        ],
      },
    ],
    dashboards: [
      { id: 'd1', name: 'Ops Dashboard', description: 'Ops metrics', reports: ['r1'] },
    ],
    selectedTimeRange: 'last_24_hours',
    isLoading: false,
    autoRefresh: true,
    getSummaryStats: {
      totalReports: 1,
      totalDashboards: 1,
      reportsUpdatedToday: 1,
      totalMetrics: 3,
      totalCharts: 2,
    },
    setTimeRange: mockSetTimeRange,
    toggleAutoRefresh: mockToggleAutoRefresh,
    refreshReports: mockRefreshReports,
    getFilteredReportsByDateRange: () => [],
    getReportsByType: () => [],
  }),
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

describe('Reporting page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reporting header and overview stats', () => {
    renderReportingPage();

    expect(screen.getAllByRole('heading', { name: /Reporting Command/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Total Reports/i)).toBeTruthy();
    expect(screen.getByText(/Total Dashboards/i)).toBeTruthy();
    expect(screen.getByText(/Signal coverage across every dashboard/i)).toBeTruthy();
  });

  it('handles refresh, time range, and auto toggle actions', () => {
    renderReportingPage();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(mockRefreshReports).toHaveBeenCalled();

    fireEvent.change(screen.getByDisplayValue('last_24_hours'), { target: { value: 'last_7_days' } });
    expect(mockSetTimeRange).toHaveBeenCalledWith('last_7_days');

    fireEvent.click(screen.getByRole('button', { name: /Auto/i }));
    expect(mockToggleAutoRefresh).toHaveBeenCalled();
  });

  it('switches to reports and dashboards tabs', () => {
    renderReportingPage();

    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));
    expect(screen.getByText(/Filter by Type/i)).toBeTruthy();
    expect(screen.getByText(/Revenue Report/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Dashboards/i }));
    expect(screen.getByText(/Ops Dashboard/i)).toBeTruthy();
  });
});
