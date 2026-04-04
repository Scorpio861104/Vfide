import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPayMerchant = jest.fn() as any;
const mockFetch = jest.fn() as any;

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    isConnected: true,
  }),
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
}));

jest.mock('@/lib/contracts', () => ({
  __esModule: true,
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0x1111111111111111111111111111111111111111',
  },
  isConfiguredContractAddress: (value?: string | null) =>
    typeof value === 'string' && value.startsWith('0x') && value !== '0x0000000000000000000000000000000000000000',
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
});
