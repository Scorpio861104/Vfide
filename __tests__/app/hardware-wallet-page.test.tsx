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
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
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
    expect(screen.getByText(/Select Device Type/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ledger/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Trezor/i })).toBeTruthy();
  });

  it('keeps connect view active after selecting wallet type', () => {
    renderHardwareWalletPage();

    fireEvent.click(screen.getByRole('button', { name: /Ledger/i }));

    expect(screen.getByText(/Select Device Type/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect via USB/i })).toBeTruthy();
    expect(screen.getByText(/Requirements/i)).toBeTruthy();
  });

  it('auto-detects connected ledger account in effect-driven state', () => {
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
      connector: { name: 'Ledger Live' },
    };

    renderHardwareWalletPage();

    expect(screen.getByRole('heading', { name: /Hardware Wallet Setup/i })).toBeTruthy();
    expect(screen.getByText(/Connected wallet:/i)).toBeTruthy();
  });
});
