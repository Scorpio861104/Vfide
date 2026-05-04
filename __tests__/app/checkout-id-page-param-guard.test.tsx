import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

let mockParams: Record<string, string> = {};

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
    address: undefined,
    isConnected: false,
  }),
}));

jest.mock('@/hooks/useMerchantHooks', () => ({
  usePayMerchant: () => ({
    payMerchant: jest.fn(),
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
});