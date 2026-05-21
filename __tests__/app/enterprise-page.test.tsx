import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

let mockIsConnected = true;

const renderEnterprisePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/enterprise/page');
  const EnterprisePage = pageModule.default as React.ComponentType;
  return render(<EnterprisePage />);
};

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: () => ({ isConnected: mockIsConnected }),
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

jest.mock('@/hooks/usePriceHooks', () => ({
  useVfidePrice: () => ({
    priceUsd: 0.07,
    source: 'coingecko',
    isLoading: false,
  }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </header>
  ),
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    ArrowUpDown: Icon,
    Building2: Icon,
    CreditCard: Icon,
    FileText: Icon,
    Globe: Icon,
    Shield: Icon,
    TrendingUp: Icon,
    Zap: Icon,
  };
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

describe('Enterprise page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsConnected = true;

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('renders overview by default and switches to Fiat tab', () => {
    renderEnterprisePage();

    expect(screen.getByText(/Enterprise-Grade Infrastructure/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Fiat On\/Off Ramp/i }));

    expect(screen.getByText(/Convert between fiat currencies and VFIDE/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sell VFIDE \(Off-Ramp\)/i })).toBeTruthy();
  });

  it('shows gateway wallet connection gate when disconnected', () => {
    mockIsConnected = false;

    renderEnterprisePage();

    fireEvent.click(screen.getByRole('button', { name: /Enterprise Gateway/i }));

    expect(screen.getByText(/Connect wallet to create orders/i)).toBeTruthy();
  });

  it('submits gateway order and resets form fields on success', async () => {
    renderEnterprisePage();

    fireEvent.click(screen.getByRole('button', { name: /Enterprise Gateway/i }));

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'ORD-NEW-001' },
    });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], {
      target: { value: '1250' },
    });
    fireEvent.change(screen.getAllByRole('textbox')[1], {
      target: { value: 'customer-99' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Order/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/enterprise/orders',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: 'ORD-NEW-001', amount: '1250', metadata: 'customer-99' }),
        })
      );
    });

    await waitFor(() => {
      expect((screen.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('');
      expect((screen.getAllByRole('spinbutton')[0] as HTMLInputElement).value).toBe('');
      expect((screen.getAllByRole('textbox')[1] as HTMLInputElement).value).toBe('');
    });
  });
});
