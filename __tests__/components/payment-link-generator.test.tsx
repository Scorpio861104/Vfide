import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

jest.mock('@/lib/security/urlValidation', () => ({
  safeWindowOpen: jest.fn(),
}));

describe('PaymentLinkGenerator', () => {
  it('uses the pay route when a merchant address is available', async () => {
    const { PaymentLinkGenerator } = require('@/components/payment-links/PaymentLinkGenerator');

    render(
      <PaymentLinkGenerator
        merchantSlug="aurora-shop"
        merchantName="Aurora Shop"
        merchantAddress="0x2222222222222222222222222222222222222222"
      />
    );

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });

    expect(await screen.findByText(/\/pay\?to=0x2222222222222222222222222222222222222222&amount=25&source=link/i)).toBeInTheDocument();
  });

  it('falls back to the storefront route when no merchant address is available', async () => {
    const { PaymentLinkGenerator } = require('@/components/payment-links/PaymentLinkGenerator');

    render(
      <PaymentLinkGenerator
        merchantSlug="aurora-shop"
        merchantName="Aurora Shop"
      />
    );

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });

    expect(await screen.findByText(/\/store\/aurora-shop\?amount=25/i)).toBeInTheDocument();
  });
});