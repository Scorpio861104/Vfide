import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderBuyPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/buy/page');
  const BuyPage = pageModule.default as React.ComponentType;
  return render(<BuyPage />);
};

jest.mock('../../app/buy/components/BuyTab', () => ({
  BuyTab: () => <div>Buy tab content</div>,
}));

jest.mock('../../app/buy/components/SwapTab', () => ({
  SwapTab: () => <div>Swap tab content</div>,
}));

jest.mock('../../app/buy/components/HistoryTab', () => ({
  HistoryTab: () => <div>History tab content</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    CreditCard: Icon,
    Building2: Icon,
    Wallet: Icon,
    Shield: Icon,
    ExternalLink: Icon,
    AlertCircle: Icon,
    Globe: Icon,
    Info: Icon,
    Copy: Icon,
    Check: Icon,
  };
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

describe('Buy page on-ramp pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, 'open', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: jest.fn() },
    });
  });

  it('renders buy page and default buy tab', () => {
    renderBuyPage();

    expect(screen.getByRole('heading', { name: /Buy Crypto/i })).toBeTruthy();
    expect(screen.getByText(/Purchase VFIDE through trusted on-ramp partners/i)).toBeTruthy();
    expect(screen.getByText(/Buy tab content/i)).toBeTruthy();
  });

  it('renders tab navigation labels', () => {
    renderBuyPage();

    expect(screen.getByRole('button', { name: 'Buy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Swap' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'History' })).toBeTruthy();
  });

  it('switches tabs', () => {
    renderBuyPage();

    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(screen.getByText(/Swap tab content/i)).toBeTruthy();
  });
});