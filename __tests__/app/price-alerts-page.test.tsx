import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const renderPriceAlertsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/price-alerts/page');
  const PriceAlertsPage = pageModule.default as React.ComponentType;
  return render(<PriceAlertsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
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
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('renders price alerts shell and market overview blocks', () => {
    renderPriceAlertsPage();

    expect(screen.getByRole('heading', { name: /Price Alerts/i })).toBeTruthy();
    expect(screen.getByText(/Price Monitoring/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Market Overview/i })).toBeTruthy();
    expect(screen.getAllByText(/VFIDE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ETH/i).length).toBeGreaterThan(0);
  });

  it('opens create modal and adds a new alert card', () => {
    renderPriceAlertsPage();

    fireEvent.click(screen.getAllByRole('button', { name: /Create Alert/i })[0]);

    expect(screen.getByRole('heading', { name: /Create Price Alert/i })).toBeTruthy();

    const targetInput = screen.getByRole('spinbutton');
    fireEvent.change(targetInput, {
      target: { value: '0.11' },
    });

    fireEvent.click(screen.getAllByRole('button', { name: /^Create Alert$/i })[0]);

    expect(screen.queryByRole('heading', { name: /Create Price Alert/i })).toBeNull();
    expect(screen.getAllByText(/VFIDE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
  });

  it('opens quick preset and preloads target values in modal', () => {
    renderPriceAlertsPage();

    fireEvent.click(screen.getByRole('button', { name: /ETH under \$3,500/i }));

    expect(screen.getByRole('heading', { name: /Create Price Alert/i })).toBeTruthy();
    expect(screen.getByDisplayValue('3500')).toBeTruthy();
    expect(screen.getByDisplayValue('ETH buying opportunity')).toBeTruthy();
  });
});
