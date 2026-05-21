import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderSocialPaymentsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/social-payments/page');
  const SocialPaymentsPage = pageModule.default as React.ComponentType;
  return render(<SocialPaymentsPage />);
};

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
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

jest.mock('@/components/social/SocialFeed', () => ({
  SocialFeed: () => <div>Social Feed Component</div>,
}));

jest.mock('@/components/social/UnifiedActivityFeed', () => ({
  UnifiedActivityFeed: () => <div>Unified Activity Feed Component</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
};
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})());

describe('Social payments page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders social payment stats and supporter list', () => {
    renderSocialPaymentsPage();

    expect(screen.getByRole('heading', { name: /Social Payments/i })).toBeTruthy();
    expect(screen.getByText(/Tips Received/i)).toBeTruthy();
    expect(screen.getByText(/Tips Sent/i)).toBeTruthy();
    expect(screen.getByText(/Top Supporters/i)).toBeTruthy();
    // Supporters section shows placeholder text (no indexed data yet)
    expect(screen.getByText(/Top supporter rankings will appear/i)).toBeTruthy();
  });

  it('switches across feed, activity, and earnings tabs', () => {
    renderSocialPaymentsPage();

    expect(screen.getByText('Social Feed Component')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /All Activity/i }));
    expect(screen.getByText('Unified Activity Feed Component')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Earnings/i }));
    expect(screen.getByText(/Recent Tips Received/i)).toBeTruthy();
    expect(screen.getAllByText(/Content Sales/i).length).toBeGreaterThan(0);
  });
});