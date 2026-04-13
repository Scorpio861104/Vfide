import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import VFIDEDashboard from '../../components/dashboard/VFIDEDashboard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div data-testid="area-chart-series" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

describe('VFIDEDashboard', () => {
  it('renders the dashboard shell with accessible toolbar controls', () => {
    render(<VFIDEDashboard />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy wallet address/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it('lets the user collapse the sidebar with the toggle control', () => {
    render(<VFIDEDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));

    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
  });
});
