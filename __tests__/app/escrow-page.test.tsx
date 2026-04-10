import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const mockCreateEscrow = jest.fn(async () => {});
const mockReleaseEscrow = jest.fn(async () => {});
const mockRefundEscrow = jest.fn(async () => {});
const mockRaiseDispute = jest.fn(async () => {});
const mockClaimTimeout = jest.fn(async () => {});
const mockRefresh = jest.fn();

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();

let mockEscrowState: any;

const renderEscrowPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/escrow/page');
  const EscrowPage = pageModule.default as React.ComponentType;
  return render(<EscrowPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
}));

jest.mock('@/lib/validation', () => ({
  validateAddress: (value: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      return { valid: false, error: 'Address format is invalid' };
    }
    return { valid: true, error: null };
  },
  safeParseInt: (value: string, fallback: number) => {
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? fallback : n;
  },
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
    info: (...args: any[]) => mockToastInfo(...args),
  },
}));

jest.mock('@/lib/escrow/useEscrow', () => ({
  useEscrow: () => mockEscrowState,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Escrow page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    mockEscrowState = {
      escrows: [],
      loading: false,
      error: null,
      activeEscrows: [],
      completedEscrows: [],
      disputedEscrows: [],
      createEscrow: mockCreateEscrow,
      releaseEscrow: mockReleaseEscrow,
      refundEscrow: mockRefundEscrow,
      raiseDispute: mockRaiseDispute,
      claimTimeout: mockClaimTimeout,
      formatEscrowAmount: (amount: bigint) => (Number(amount) / 1e18).toString(),
      getTimeRemaining: () => '2 days',
      refresh: mockRefresh,
    };
  });

  it('shows wallet-connect guard when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderEscrowPage();

    expect(screen.getByRole('heading', { name: /Buyer Protection/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to view and manage your escrows/i)).toBeTruthy();
  });

  it('disables Create Escrow button when wallet is not connected', () => {
    mockAccountState = { isConnected: false, address: undefined as unknown as `0x${string}` };

    renderEscrowPage();

    const createBtn = screen.getByRole('button', { name: /Create new escrow/i });
    expect((createBtn as HTMLButtonElement).disabled).toBe(true);

    // Clicking the disabled button must not open the modal or invoke createEscrow
    fireEvent.click(createBtn);
    // The modal form (with merchant address input) must not appear
    expect(screen.queryByPlaceholderText('0x...')).toBeNull();
    expect(mockCreateEscrow).not.toHaveBeenCalled();
  });

  it('shows empty state and refresh action when no escrows exist', () => {
    renderEscrowPage();

    expect(screen.getByText(/No Escrows Found/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('creates escrow and validates merchant address before submission', async () => {
    renderEscrowPage();

    // Open the create modal via the aria-label button
    fireEvent.click(screen.getByRole('button', { name: /Create new escrow/i }));
    fireEvent.change(screen.getByPlaceholderText('0x...'), { target: { value: 'bad-address' } });
    fireEvent.change(screen.getByPlaceholderText('1000'), { target: { value: '25' } });
    fireEvent.change(screen.getByPlaceholderText('ORD-2026-0001'), { target: { value: 'ORD-1' } });
    // Second "Create Escrow" button is the modal submit
    fireEvent.click(screen.getAllByRole('button', { name: /Create Escrow/i })[0]);

    expect(mockToastError).toHaveBeenCalled();
    expect(mockCreateEscrow).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('0x...'), {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Create Escrow/i })[0]);

    await waitFor(() => {
      expect(mockCreateEscrow).toHaveBeenCalledWith('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '25', 'ORD-1');
      expect(mockToastSuccess).toHaveBeenCalledWith('Escrow created successfully');
    });
  });
});