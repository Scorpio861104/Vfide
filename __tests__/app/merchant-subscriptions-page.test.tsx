import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantSubscriptionsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/subscriptions/page');
  const MerchantSubscriptionsPage = pageModule.default as React.ComponentType;
  return render(<MerchantSubscriptionsPage />);
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

describe('Merchant subscriptions route', () => {
  it('renders disconnected wallet state and subscriptions heading', () => {
    renderMerchantSubscriptionsPage();

    expect(screen.getByRole('heading', { name: /Subscription plans/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to Merchant Hub/i }).getAttribute('href')).toBe('/merchant');
    expect(screen.getByText(/Connect the merchant wallet to manage subscription plans/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
