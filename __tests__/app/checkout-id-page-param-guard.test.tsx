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
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAddress,
    isConnected: mockIsConnected,
  }),
}));

jest.mock('@/hooks/useMerchantHooks', () => ({
  usePayMerchant: () => ({
    payMerchant: mockPayMerchant,
    isPaying: false,
  }),
}));

jest.mock('@/lib/preferences/userPreferences', () => ({
  useOptionalPreferences: () => ({
    preferences: {
      preferredCurrency: 'USD',
    },
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Shield: Icon,
    Clock: Icon,
    CheckCircle: Icon,
    AlertTriangle: Icon,
    FileText: Icon,
    ExternalLink: Icon,
    Copy: Icon,
  };
});

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