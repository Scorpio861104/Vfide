import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

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

jest.mock('@/components/merchant/MerchantTrustBadge', () => ({
  MerchantTrustBadge: () => <div data-testid="merchant-trust-badge" />,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/(commerce)/store/[slug]/components/ShareStoreSheet', () => ({
  ShareStoreSheet: () => null,
}));

jest.mock('@/components/checkout/CheckoutPanel', () => ({
  CheckoutPanel: ({ items }: { items: Array<{ name: string }> }) => (
    <div data-testid="checkout-panel">Checkout for {items.map((item) => item.name).join(', ')}</div>
  ),
}));

const renderStoreClient = () => {
  const { CartProvider } = require('../../providers/CartProvider');
  const { StoreClient } = require('../../app/(commerce)/store/[slug]/components/StoreClient');

  return render(
    <CartProvider>
      <StoreClient
        merchant={{
          merchant_address: '0x1111111111111111111111111111111111111111',
          display_name: 'Kofi Market',
          theme_color: '#06b6d4',
        }}
        slug="kofi-market"
        initialProducts={[
          {
            id: 'prod-1',
            name: 'Kente Cloth',
            slug: 'kente-cloth',
            price: '12.00',
            compare_at_price: null,
            images: [],
            product_type: 'physical',
            description: 'Handwoven cloth',
          },
        ]}
      />
    </CartProvider>
  );
};

describe('Store cart flow', () => {
  it('adds storefront items to the shared cart and opens checkout', () => {
    renderStoreClient();

    expect(screen.queryByText(/items in cart/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /add kente cloth to cart/i }));

    expect(screen.getByText(/1 item in cart/i)).toBeTruthy();
    expect(screen.getByText(/\$12\.00 each/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /checkout/i }));

    expect(screen.getByTestId('checkout-panel').textContent).toContain('Checkout for Kente Cloth');
  });
});
