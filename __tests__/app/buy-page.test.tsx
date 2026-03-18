import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
};

const renderBuyPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/buy/page');
  const BuyPage = pageModule.default as React.ComponentType;
  return render(<BuyPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
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

jest.mock('lucide-react', () => {
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
});

describe('Buy page on-ramp pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    };

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

  it('shows wallet connection gate when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0x1111111111111111111111111111111111111111',
    };

    renderBuyPage();

    expect(screen.getByRole('heading', { name: /Buy Crypto/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to receive purchased crypto/i)).toBeTruthy();
    expect(screen.queryByText(/Choose a Provider/i)).toBeNull();
  });

  it('opens selected provider checkout URL with wallet address', () => {
    renderBuyPage();

    fireEvent.click(screen.getByText('MoonPay'));
    fireEvent.click(screen.getByRole('button', { name: /Buy with MoonPay/i }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const openCall = (window.open as jest.Mock).mock.calls[0] as [string, string, string];
    expect(openCall[0]).toContain('buy.moonpay.com');
    expect(openCall[0]).toContain('walletAddress=0x1111111111111111111111111111111111111111');
  });

  it('supports quick amount presets before provider checkout', () => {
    renderBuyPage();

    fireEvent.click(screen.getByRole('button', { name: '$500' }));
    fireEvent.click(screen.getByText('MoonPay'));
    fireEvent.click(screen.getByRole('button', { name: /Buy with MoonPay/i }));

    const openCall = (window.open as jest.Mock).mock.calls[0] as [string, string, string];
    expect(openCall[0]).toContain('baseCurrencyAmount=500');
  });
});