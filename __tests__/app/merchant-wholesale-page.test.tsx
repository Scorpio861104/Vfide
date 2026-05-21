import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn<typeof fetch>();

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
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

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({
    formatCurrency: (value: number | string | null | undefined) => `$${Number(value ?? 0).toFixed(2)}`,
  }),
}));

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  localStorage.clear();
});

describe('Merchant wholesale page', () => {
  it('loads live wholesale products and persists group buys', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          {
            id: 'p1',
            name: 'Wholesale Rice Sack',
            price: '24',
            merchant_name: 'Lagos Grain Co',
            merchant_address: '0x2222222222222222222222222222222222222222',
            inventory_count: 250,
          },
        ],
      }),
    } as Response);

    const pageModule = require('../../app/merchant/wholesale/page');
    const MerchantWholesalePage = pageModule.default as React.ComponentType;
    render(<MerchantWholesalePage />);

    expect(await screen.findByText(/Wholesale Rice Sack/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Wholesale Rice Sack/i }));
    fireEvent.change(screen.getByLabelText(/Order quantity/i), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /Start group buy/i }));

    await waitFor(() => {
      expect(localStorage.getItem('vfide.wholesale.group-buys.0x1111111111111111111111111111111111111111')).toContain('Wholesale Rice Sack');
    });

    expect(await screen.findByText(/Your group buys/i)).toBeTruthy();
  });

  it('submits wholesale purchase orders through merchant supplier APIs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [
            {
              id: 'p2',
              name: 'Bulk Cocoa Beans',
              price: '16',
              merchant_name: 'Accra Cocoa Traders',
              merchant_address: '0x3333333333333333333333333333333333333333',
              inventory_count: 120,
            },
          ],
        }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, purchaseOrder: { id: 'po-1' } }),
      } as Response);

    const pageModule = require('../../app/merchant/wholesale/page');
    const MerchantWholesalePage = pageModule.default as React.ComponentType;
    render(<MerchantWholesalePage />);

    expect(await screen.findByText(/Bulk Cocoa Beans/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Bulk Cocoa Beans/i }));
    fireEvent.change(screen.getByLabelText(/Order quantity/i), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Place order/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/merchant/suppliers',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(await screen.findByText(/Purchase order sent/i)).toBeTruthy();
  });
});
