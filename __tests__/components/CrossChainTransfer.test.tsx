import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CrossChainTransfer from '../../components/CrossChainTransfer';

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
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
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/crossChain', () => ({
  useCrossChain: () => ({
    balances: [
      { token: 'ETH', totalBalance: 'not-a-number' },
      { token: 'USDC', totalBalance: '12.3456' },
    ],
    routes: [],
    currentTransfer: null,
    loading: false,
    error: null,
    supportedChains: [
      { id: 8453, name: 'Base', isTestnet: false },
      { id: 42161, name: 'Arbitrum', isTestnet: false },
    ],
    findOptimalRoutes: jest.fn(),
    getChain: jest.fn(),
    refreshBalances: jest.fn(),
  }),
}));

describe('CrossChainTransfer', () => {
  it('renders invalid balances safely without showing NaN', () => {
    render(<CrossChainTransfer />);

    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.getByText('0.0000')).toBeInTheDocument();
    expect(screen.getByText('12.3456')).toBeInTheDocument();
  });
});
