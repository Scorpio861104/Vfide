import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantPaymentLinksPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/payment-links/page');
  const MerchantPaymentLinksPage = pageModule.default as React.ComponentType;
  return render(<MerchantPaymentLinksPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant payment links route', () => {
  it('renders disconnected wallet state and merchant back-link', () => {
    renderMerchantPaymentLinksPage();

    expect(screen.getByRole('heading', { name: /Shareable checkout links/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to Merchant Hub/i }).getAttribute('href')).toBe('/merchant');
    expect(screen.getByText(/Connect the merchant wallet to manage payment links/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
