import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockPayMerchant = jest.fn();

let mockParams: Record<string, string> = {};
let mockAddress: string | undefined;
let mockIsConnected = false;

const renderCheckoutPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/checkout/[id]/page');
  const CheckoutPage = pageModule.default as React.ComponentType;
  return render(<CheckoutPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
})),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}));

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => ({ address: mockAddress, isConnected: mockIsConnected, status: mockIsConnected ? 'connected' : 'disconnected', chainId: mockIsConnected ? 137 : undefined }),
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

jest.mock('@/hooks/useMerchantHooks', () => ({
  usePayMerchant: () => ({
    payMerchant: mockPayMerchant,
    isPaying: false,
  }),
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => {
    const React = require('react');
    return React.createElement('button', { 'data-testid': 'connect-wallet-btn' }, 'Connect Wallet');
  },
}));

jest.mock('@/components/ui/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, onCancel }: any) => {
    const React = require('react');
    if (!isOpen) return null;
    return React.createElement('div', { 'data-testid': 'confirm-modal' },
      React.createElement('button', { onClick: onConfirm }, 'Confirm'),
      React.createElement('button', { onClick: onCancel }, 'Cancel'),
    );
  },
}));

jest.mock('@/lib/preferences/userPreferences', () => ({
  useOptionalPreferences: () => ({
    preferences: {
      preferredCurrency: 'USD',
    },
  }),
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const Icon = ({ className }: { className?: string }) => {
    const React = require('react');
    return React.createElement('span', { className }, 'icon');
  };
  const __orig: Record<string, any> = {
    Shield: Icon,
    Clock: Icon,
    CheckCircle: Icon,
    AlertTriangle: Icon,
    FileText: Icon,
    ExternalLink: Icon,
    Copy: Icon,
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

describe('Checkout route param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockAddress = undefined;
    mockIsConnected = false;
    mockPayMerchant.mockReset();
    (global as any).fetch = mockFetch;
  });

  it('renders not-found state when the checkout id route param is missing', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: /Invoice Not Found/i })).toBeTruthy();
    expect(screen.getByText(/payment link may have expired or been removed/i)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renders merchant identity details from the checkout payload', async () => {
    mockParams = { id: 'pay_123' };
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          invoice: {
            invoice_number: 'INV-202605-ABCD',
            merchant_name: 'Kofi Market',
            merchant_address: '0x1111111111111111111111111111111111111111',
            customer_address: null,
            customer_name: null,
            status: 'viewed',
            token: '0x2222222222222222222222222222222222222222',
            subtotal: '10',
            tax_rate: '0',
            tax_amount: '0',
            total: '10',
            currency_display: 'USDC',
            memo: null,
            due_date: null,
            paid_at: null,
            tx_hash: null,
            created_at: '2026-05-03T00:00:00.000Z',
            items: [],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Merchant identity')).toBeTruthy();
      expect(screen.getByText('Kofi Market')).toBeTruthy();
      expect(screen.getByText('0x1111111111111111111111111111111111111111')).toBeTruthy();
    });
  });

  it('propagates the returned payMerchant hash into checkout PATCH confirmation', async () => {
    mockParams = { id: 'pay_123' };
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockIsConnected = true;
    mockPayMerchant.mockResolvedValue({
      success: true,
      hash: `0x${'b'.repeat(64)}`,
    });

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            invoice: {
              invoice_number: 'INV-202605-ABCD',
              merchant_name: 'Kofi Market',
              merchant_address: '0x1111111111111111111111111111111111111111',
              customer_address: null,
              customer_name: null,
              status: 'viewed',
              token: '0x2222222222222222222222222222222222222222',
              subtotal: '10',
              tax_rate: '0',
              tax_amount: '0',
              total: '10',
              currency_display: 'USDC',
              memo: null,
              due_date: null,
              paid_at: null,
              tx_hash: null,
              created_at: '2026-05-03T00:00:00.000Z',
              items: [],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

    renderCheckoutPage();

    const payButton = await screen.findByRole('button', { name: /Pay 10\.0000 USDC/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find((call) => String(call[0]).includes('/api/merchant/checkout/pay_123') && String(call[1]?.method) === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
        action: 'pay',
        tx_hash: `0x${'b'.repeat(64)}`,
      });
    });
  });
});