import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: true,
};

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

const renderStreamingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/streaming/page');
  const StreamingPage = pageModule.default as React.ComponentType;
  return render(<StreamingPage />);
};

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
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
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

describe('Streaming page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };
  });

  it('renders connect prompt when wallet is disconnected', () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
      isConnected: false,
    };

    renderStreamingPage();

    expect(screen.getByRole('heading', { name: /Streaming Payments/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage payment streams/i)).toBeTruthy();
  });

  it('renders stream stats and supports tab switching', () => {
    renderStreamingPage();

    expect(screen.getByRole('heading', { name: /Streaming Payments/i })).toBeTruthy();
    expect(screen.getByText(/Active Streams/i)).toBeTruthy();
    expect(screen.getByText(/Total Value/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /incoming Streams/i }));
    expect(screen.getByRole('button', { name: /incoming Streams/i })).toBeTruthy();
  });

  it('opens create modal and validates required fields', () => {
    renderStreamingPage();

    fireEvent.click(screen.getByRole('button', { name: /\+ Create Stream/i }));
    expect(screen.getByRole('heading', { name: /Create Payment Stream/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Create Stream$/i }));
    expect(mockToastError).toHaveBeenCalledWith('Please fill all fields');

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '0xbbb' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '3' } });
    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: /^Create Stream$/i }));
    expect(mockToastSuccess).toHaveBeenCalledWith('Stream created successfully');
  });
});
