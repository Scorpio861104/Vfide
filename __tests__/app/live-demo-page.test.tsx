import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const showNotification = jest.fn();

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/live-demo/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/layout/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));
jest.mock('@/components/trust/ProofScoreVisualizer', () => ({ ProofScoreVisualizer: () => <div>ProofScoreVisualizer</div> }));
jest.mock('@/components/trust/LiveActivityFeed', () => ({ LiveActivityFeed: () => <div>LiveActivityFeed</div> }));
jest.mock('@/components/commerce/FeeSavingsCalculator', () => ({ FeeSavingsCalculator: () => <div>FeeSavingsCalculator</div> }));
jest.mock('@/components/stats/LiveSystemStats', () => ({ LiveSystemStats: () => <div>LiveSystemStats</div> }));
jest.mock('@/components/wallet/TransactionNotification', () => ({
  TransactionNotification: () => <div>TransactionNotification</div>,
  useTransactionNotifications: () => ({
    notification: null,
    showNotification,
    closeNotification: jest.fn(),
  }),
}));

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => ({ address: '0x123', isConnected: true }),
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
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
}));

jest.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return { motion: new Proxy({}, { get: () => MotionTag }) };
});

describe('Live demo page', () => {
  it('renders hero and feature components', () => {
    renderPage();
    expect(screen.getByText(/Experience/i)).toBeTruthy();
    expect(screen.getByText(/VFIDE Live/i)).toBeTruthy();
    expect(screen.getByText('LiveSystemStats')).toBeTruthy();
    expect(screen.getByText('LiveActivityFeed')).toBeTruthy();
  });

  it('triggers demo transaction notification flow', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Endorse Another User/i }));
    expect(showNotification).toHaveBeenCalled();
  });
});
