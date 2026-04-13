import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderPriceAlertsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/price-alerts/page');
  const PriceAlertsPage = pageModule.default as React.ComponentType;
  return render(<PriceAlertsPage />);
};

jest.mock('../../app/price-alerts/components/ActiveTab', () => ({
  ActiveTab: () => <div>Active alerts content</div>,
}));

jest.mock('../../app/price-alerts/components/CreateTab', () => ({
  CreateTab: () => <div>Create alert content</div>,
}));

jest.mock('../../app/price-alerts/components/HistoryTab', () => ({
  HistoryTab: () => <div>Alert history content</div>,
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
      return ({ children, ...props }: any) => <div {...props}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Price alerts page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders price alerts shell and default active tab', () => {
    renderPriceAlertsPage();

    expect(screen.getByText(/^Price Alerts$/i)).toBeTruthy();
    expect(screen.getByText(/Monitor token prices/i)).toBeTruthy();
    expect(screen.getByText(/Active alerts content/i)).toBeTruthy();
  });

  it('renders tab navigation labels', () => {
    renderPriceAlertsPage();

    expect(screen.getByRole('button', { name: /^Active Alerts$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Create Alert$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();
  });

  it('switches to create alert tab', () => {
    renderPriceAlertsPage();

    fireEvent.click(screen.getByRole('button', { name: /^Create Alert$/i }));
    expect(screen.getByText(/Create alert content/i)).toBeTruthy();
  });
});
