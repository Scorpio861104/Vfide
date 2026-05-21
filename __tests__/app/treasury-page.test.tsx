import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
};

const renderTreasuryPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/treasury/page');
  const TreasuryPage = pageModule.default as React.ComponentType;
  return render(<TreasuryPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
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
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
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
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Treasury page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = { isConnected: true };
  });

  it('renders treasury overview and distribution sections', () => {
    renderTreasuryPage();

    expect(screen.getByRole('heading', { name: /Treasury Dashboard/i })).toBeTruthy();
    expect(screen.getByText(/Fee Distribution Breakdown/i)).toBeTruthy();
    expect(screen.getByText(/Recent Distributions/i)).toBeTruthy();
  });

  it('shows sanctum disbursement connect gate when disconnected', () => {
    mockAccount = { isConnected: false };
    renderTreasuryPage();

    fireEvent.click(screen.getByRole('button', { name: /Sanctum \(Charity\)/i }));

    expect(screen.getByRole('heading', { name: /Sanctum Charity Vault/i })).toBeTruthy();
    expect(screen.getByText(/Connect wallet to view and approve disbursements/i)).toBeTruthy();
  });

  it('shows ecosystem rewards panel for connected wallet', () => {
    renderTreasuryPage();

    fireEvent.click(screen.getByRole('button', { name: /Ecosystem Vault/i }));

    expect(screen.getByRole('heading', { name: /Allocation Breakdown/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Your Claimable Rewards/i })).toBeTruthy();
  });
});
