import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const renderTimeLocksPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/time-locks/page');
  const TimeLocksPage = pageModule.default as React.ComponentType;
  return render(<TimeLocksPage />);
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

describe('Time locks page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('shows wallet connect guard when disconnected', () => {
    mockAccount = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderTimeLocksPage();

    expect(screen.getByRole('heading', { name: /Time Locks/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage time-locked transfers/i)).toBeTruthy();
  });

  it('renders connected security tiers and pending transfer section', () => {
    renderTimeLocksPage();

    expect(screen.getByRole('heading', { name: /Time-Locked Transfers/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Security Tiers/i })).toBeTruthy();
    expect(screen.getByText(/Pending Transfers/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Whitelisted Addresses/i })).toBeTruthy();
  });

  it('shows empty pending transfers state', async () => {
    renderTimeLocksPage();

    // No time-locked transfers are populated (timeLocks state is empty)
    expect(screen.getByText(/No pending time-locked transfers/i)).toBeTruthy();
  });
});
