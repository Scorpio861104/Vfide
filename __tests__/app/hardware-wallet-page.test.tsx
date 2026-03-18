import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: false,
  connector: undefined as { name?: string } | undefined,
};

const mockConnect = jest.fn();

const renderHardwareWalletPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/hardware-wallet/page');
  const HardwareWalletPage = pageModule.default as React.ComponentType;
  return render(<HardwareWalletPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useConnect: () => ({
    connect: mockConnect,
    connectors: [
      { id: 'ledger', name: 'Ledger' },
      { id: 'trezor', name: 'Trezor' },
    ],
  }),
  useDisconnect: () => ({
    disconnect: jest.fn(),
  }),
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

describe('Hardware wallet page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: false,
      connector: undefined,
    };
  });

  it('renders setup header and wallet selection step by default', () => {
    renderHardwareWalletPage();

    expect(screen.getByRole('heading', { name: /Hardware Wallet Setup/i })).toBeTruthy();
    expect(screen.getByText(/Maximum Security Setup/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Select Your Hardware Wallet/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ledger/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Trezor/i })).toBeTruthy();
  });

  it('moves to firmware verification step after wallet selection', () => {
    renderHardwareWalletPage();

    fireEvent.click(screen.getByRole('button', { name: /Ledger/i }));

    expect(screen.getByRole('heading', { name: /Verify Ledger/i })).toBeTruthy();
    expect(screen.getByText(/Firmware Verification/i)).toBeTruthy();
    expect(screen.getByText(/Download Ledger App/i)).toBeTruthy();
  });

  it('auto-detects connected ledger account in effect-driven state', () => {
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
      connector: { name: 'Ledger Live' },
    };

    renderHardwareWalletPage();

    expect(screen.getByRole('heading', { name: /Hardware Wallet Setup/i })).toBeTruthy();
    expect(screen.getByText(/Select Your Hardware Wallet/i)).toBeTruthy();
  });
});
