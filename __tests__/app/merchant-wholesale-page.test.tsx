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
