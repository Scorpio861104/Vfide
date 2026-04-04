import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/checkout/CheckoutPanel', () => ({
  CheckoutPanel: ({ items }: { items: Array<{ name: string }> }) => (
    <div data-testid="checkout-panel">Checkout for {items.map((item) => item.name).join(', ')}</div>
  ),
}));

jest.mock('../../app/product/[id]/components/StarRating', () => ({
  StarRating: () => <div data-testid="star-rating" />,
}));

const renderProductInfo = () => {
  const { CartProvider } = require('../../providers/CartProvider');
  const { ProductInfo } = require('../../app/product/[id]/components/ProductInfo');

  return render(
    <CartProvider>
      <ProductInfo
        product={{
          id: 'prod-1',
          name: 'Kente Cloth',
          price: '12.00',
          compare_at_price: null,
          description: 'Handwoven cloth',
          long_description: 'Handwoven cloth for special occasions',
          product_type: 'physical',
          variants: [{ id: 'var-1', label: 'Standard', price_override: null }],
          merchant_slug: 'kofi-market',
          merchant_name: 'Kofi Market',
          merchant_address: '0x1111111111111111111111111111111111111111',
          avg_rating: 4.8,
          review_count: 12,
          track_inventory: true,
          inventory_count: 8,
        }}
      />
    </CartProvider>
  );
};

describe('Product detail cart flow', () => {
  it('adds the product into the shared cart and opens checkout', () => {
    renderProductInfo();

    fireEvent.click(screen.getByRole('button', { name: /add kente cloth to cart/i }));

    expect(screen.getByText(/1 item in cart/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /checkout now/i }));

    expect(screen.getByTestId('checkout-panel').textContent).toContain('Checkout for Kente Cloth');
  });
});
