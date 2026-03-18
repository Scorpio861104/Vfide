import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;
let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
let mockChainId = 8453;

const mockRefetch = jest.fn();
const mockFileAppeal = jest.fn();

let mockAppealStatus = {
  hasAppeal: false,
  resolved: false,
  approved: false,
  timestamp: null as string | null,
  reason: null as string | null,
  resolution: null as string | null,
  isLoading: false,
  error: null as Error | null,
};

let mockFileAppealState = {
  isLoading: false,
  isSuccess: false,
  error: null as Error | null,
};

const renderAppealsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/appeals/page');
  const AppealsPage = pageModule.default as React.ComponentType;
  return render(<AppealsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAddress,
    isConnected: mockIsConnected,
  }),
  useChainId: () => mockChainId,
}));

jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '1 hour ago',
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useAppealStatus: () => ({
    ...mockAppealStatus,
    refetch: mockRefetch,
  }),
  useFileAppeal: () => ({
    fileAppeal: mockFileAppeal,
    ...mockFileAppealState,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Gavel: Icon,
    CheckCircle2: Icon,
    Clock: Icon,
    XCircle: Icon,
    AlertTriangle: Icon,
    Loader2: Icon,
    Search: Icon,
    ShieldCheck: Icon,
    Copy: Icon,
    Download: Icon,
  };
});

describe('Appeals page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockIsConnected = true;
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockChainId = 8453;

    mockAppealStatus = {
      hasAppeal: false,
      resolved: false,
      approved: false,
      timestamp: null,
      reason: null,
      resolution: null,
      isLoading: false,
      error: null,
    };

    mockFileAppealState = {
      isLoading: false,
      isSuccess: false,
      error: null,
    };
  });

  it('shows connect-wallet warning and blocks submit when disconnected', () => {
    mockIsConnected = false;
    mockAddress = undefined;

    renderAppealsPage();

    expect(screen.getByText(/Connect your wallet to file an appeal/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Submit Appeal/i }).hasAttribute('disabled')).toBe(true);
  });

  it('disables submit while pending appeal already exists', () => {
    mockAppealStatus = {
      ...mockAppealStatus,
      hasAppeal: true,
      resolved: false,
      timestamp: '2026-03-15T00:00:00.000Z',
      reason: 'prior reason',
    };

    renderAppealsPage();

    expect(screen.getByText(/already have a pending appeal/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Appeal Pending/i }).hasAttribute('disabled')).toBe(true);
  });

  it('resolves known reason code details and shows unknown-code fallback', async () => {
    renderAppealsPage();

    const input = screen.getByPlaceholderText(/Enter reason code/i);

    fireEvent.change(input, { target: { value: '121' } });
    expect(await screen.findByText(/Code 121/i)).toBeTruthy();

    fireEvent.change(input, { target: { value: '9999' } });
    await waitFor(() => {
      expect(screen.getByText(/Unknown code/i)).toBeTruthy();
    });
  });

  it('submits trimmed appeal reason and refetches status', async () => {
    renderAppealsPage();

    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: '  wrong flag due to unusual but valid tx  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Appeal/i }));

    await waitFor(() => {
      expect(mockFileAppeal).toHaveBeenCalledWith('wrong flag due to unusual but valid tx');
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});