import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPayMerchant = jest.fn() as any;
const mockFetch = jest.fn() as any;

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
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
  http: jest.fn(() => ({})),
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => React.createElement('div', props, children),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('@/lib/vfide-hooks', () => ({
  __esModule: true,
  usePayMerchant: () => ({
    payMerchant: mockPayMerchant,
    isPaying: false,
    error: null,
  }),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useProofScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useScoreBreakdown: jest.fn(() => ({ breakdown: undefined, isLoading: false, refetch: jest.fn() })),
  useEndorse: jest.fn(() => ({ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCustomerTrustScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useIsMerchant: jest.fn(() => ({ isMerchant: false, isLoading: false, refetch: jest.fn() })),
  useRegisterMerchant: jest.fn(() => ({ registerMerchant: jest.fn(), registerMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  useGetAutoConvert: jest.fn(() => ({ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true })),
  useSetAutoConvert: jest.fn(() => ({ setAutoConvert: jest.fn(), setAutoConvertAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetPayoutAddress: jest.fn(() => ({ setPayoutAddress: jest.fn(), setPayoutAddressAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetMerchantPullPermit: jest.fn(() => ({ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false })),
  useProcessPayment: jest.fn(() => ({ processPayment: jest.fn(), processPaymentAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}));

jest.mock('@/lib/contracts', () => ({
  __esModule: true,
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0x1111111111111111111111111111111111111111',
  },
  isConfiguredContractAddress: (value?: string | null) =>
    typeof value === 'string' && value.startsWith('0x') && value !== '0x0000000000000000000000000000000000000000',

  getContractAddresses: () => ({}),
  validateContractAddress: jest.fn((addr: any) => addr),
}));

jest.mock('@/components/checkout/CouponInput', () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-input" />,
}));

jest.mock('@/components/checkout/TipSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="tip-selector" />,
}));

jest.mock('@/lib/nfc', () => ({
  writePaymentNFC: jest.fn(async () => ({ success: true })),
  isNFCSupported: jest.fn(() => true),
}));

jest.mock('@/lib/printer', () => ({
  printReceipt: jest.fn(async () => ({ success: true })),
  isPrinterSupported: jest.fn(() => true),
}));

const renderCheckoutPanel = (onComplete = jest.fn()) => {
  const checkoutModule = require('../../components/checkout/CheckoutPanel');
  const { LocaleProvider } = require('../../lib/locale/LocaleProvider');
  const CheckoutPanel = checkoutModule.CheckoutPanel as React.ComponentType<any>;

  render(
    <LocaleProvider>
      <CheckoutPanel
        items={[{ name: 'Kente Cloth', price: 20, qty: 1 }]}
        merchantAddress="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        merchantName="Kofi Fabrics"
        tokenPrice={0.5}
        onComplete={onComplete}
      />
    </LocaleProvider>
  );

  return { onComplete };
};

const renderCheckoutPanelWithoutQuote = () => {
  const checkoutModule = require('../../components/checkout/CheckoutPanel');
  const { LocaleProvider } = require('../../lib/locale/LocaleProvider');
  const CheckoutPanel = checkoutModule.CheckoutPanel as React.ComponentType<any>;

  render(
    <LocaleProvider>
      <CheckoutPanel
        items={[{ name: 'Kente Cloth', price: 20, qty: 1 }]}
        merchantAddress="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        merchantName="Kofi Fabrics"
      />
    </LocaleProvider>
  );
};

describe('CheckoutPanel payment wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayMerchant.mockResolvedValue({
      success: true,
      hash: `0x${'a'.repeat(64)}`,
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/merchant/loyalty')) {
        return {
          ok: false,
          json: async () => ({}),
        };
      }

      if (url.includes('/api/merchant/orders')) {
        return {
          ok: true,
          json: async () => ({ order: { id: 1 } }),
        };
      }

      return {
        ok: true,
        json: async () => ({}),
      };
    });

    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('uses the merchant payment hook and records the completed order', async () => {
    const { onComplete } = renderCheckoutPanel();

    fireEvent.click(screen.getByRole('button', { name: /Pay \$20\.20/i }));

    await waitFor(() => {
      expect(mockPayMerchant).toHaveBeenCalledWith(
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        '0x1111111111111111111111111111111111111111',
        '40.4',
        expect.stringMatching(/^CHK-/)
      );
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(`0x${'a'.repeat(64)}`);
      expect(screen.getByText(/Payment complete/i)).toBeTruthy();
    });

    const orderCall = mockFetch.mock.calls.find((call: any[]) => String(call[0]).includes('/api/merchant/orders'));
    expect(orderCall).toBeTruthy();

    const [, options] = orderCall as [string, RequestInit];
    const payload = JSON.parse(String(options.body));

    expect(payload).toMatchObject({
      merchant_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      tx_hash: `0x${'a'.repeat(64)}`,
      token: 'VFIDE',
    });
    expect(payload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Kente Cloth', quantity: 1, unit_price: 20 }),
      ])
    );
  });

  it('disables payment when no live VFIDE quote is available', () => {
    renderCheckoutPanelWithoutQuote();

    expect(screen.getByText(/Live VFIDE pricing is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$20\.20/i })).toBeDisabled();
  });
});
