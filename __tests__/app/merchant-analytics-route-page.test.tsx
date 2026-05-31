import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantAnalyticsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/analytics/page');
  const MerchantAnalyticsPage = pageModule.default as React.ComponentType;
  return render(<MerchantAnalyticsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/analytics/MerchantAnalytics', () => ({
  MerchantAnalytics: () => <div data-testid="merchant-analytics">MerchantAnalytics</div>,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return { BarChart3: Icon };
});

describe('Merchant analytics route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantAnalyticsPage();

    expect(screen.getByRole('heading', { name: /Merchant Analytics/i })).toBeTruthy();
    expect(screen.getByText(/Connect your merchant wallet/i)).toBeTruthy();
    expect(screen.getByText(/Sign in with the wallet linked to your store/i)).toBeTruthy();
  });
});
