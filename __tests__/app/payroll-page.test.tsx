import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: true,
};

let mockPayrollState: any;

const renderPayrollPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/payroll/page');
  const PayrollPage = pageModule.default as React.ComponentType;
  return render(<PayrollPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
}));

jest.mock('@/hooks/usePayroll', () => ({
  usePayroll: () => mockPayrollState,
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
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
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };

    mockPayrollState = {
      streams: [],
      receivingStreams: [],
      sendingStreams: [],
      loading: false,
      error: null,
      isDeployed: true,
      currentTime: 0,
      totalReceiving: 0n,
      totalSending: 0n,
      totalClaimable: 0n,
      createStream: jest.fn(async () => {}),
      withdraw: jest.fn(async () => {}),
      pauseStream: jest.fn(async () => {}),
      resumeStream: jest.fn(async () => {}),
      topUp: jest.fn(async () => {}),
      refresh: jest.fn(async () => {}),
      formatAmount: () => '0',
      formatMonthlyRate: () => '0 / month',
      formatTimeRemaining: () => '0d',
      calculateClaimable: () => 0n,
    };
  });

  it('renders payroll hero and stream-management shell', () => {
    renderPayrollPage();

    expect(screen.getByText(/Salary Streaming/i)).toBeTruthy();
    expect(screen.getByText(/Get Paid/i)).toBeTruthy();
    expect(screen.getAllByText(/Every Second/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Receiving/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Stream/i })).toBeTruthy();
  });

  it('shows connect-wallet guard when disconnected', () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
      isConnected: false,
    };

    renderPayrollPage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to view and manage your salary streams/i)).toBeTruthy();
  });

  it('shows empty stream state for connected wallet with no entries', () => {
    renderPayrollPage();

    expect(screen.getByRole('heading', { name: /No Streams Found/i })).toBeTruthy();
    expect(screen.getByText(/You're not receiving any salary streams yet/i)).toBeTruthy();
  });
});
