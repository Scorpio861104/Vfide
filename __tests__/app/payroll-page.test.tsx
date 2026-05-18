import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderPayrollPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/payroll/page');
  const PayrollPage = pageModule.default as React.ComponentType;
  return render(<PayrollPage />);
};

jest.mock('../../app/payroll/components/DashboardTab', () => ({
  DashboardTab: () => <div>Payroll dashboard content</div>,
}));

jest.mock('../../app/payroll/components/StreamsTab', () => ({
  StreamsTab: () => <div>Payroll streams content</div>,
}));

jest.mock('../../app/payroll/components/CreateTab', () => ({
  CreateTab: () => <div>Payroll create content</div>,
}));

jest.mock('../../app/payroll/components/HistoryTab', () => ({
  HistoryTab: () => <div>Payroll history content</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      if (key === 'button') {
        return ({ children, ...props }: any) => <button {...props}>{children}</button>;
      }
      if (key === 'main') {
        return ({ children, ...props }: any) => <main {...props}>{children}</main>;
      }
      return ({ children, ...props }: any) => <div {...props}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Payroll page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payroll hero and default dashboard tab', () => {
    renderPayrollPage();

    expect(screen.getByText(/^Payroll$/i)).toBeTruthy();
    expect(screen.getByText(/Manage team payments and streaming salaries/i)).toBeTruthy();
    expect(screen.getByText(/Payroll dashboard content/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Stream/i })).toBeTruthy();
  });

  it('renders payroll tab navigation labels', () => {
    renderPayrollPage();

    expect(screen.getByRole('button', { name: /^Dashboard$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Streams$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Create Stream$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();
  });

  it('switches to streams tab content', () => {
    renderPayrollPage();

    fireEvent.click(screen.getByRole('button', { name: /^Streams$/i }));
    expect(screen.getByText(/Payroll streams content/i)).toBeTruthy();
  });
});
