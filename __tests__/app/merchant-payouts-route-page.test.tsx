import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantPayoutsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/payouts/page');
  const MerchantPayoutsPage = pageModule.default as React.ComponentType;
  return render(<MerchantPayoutsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', formatDate: () => 'Date' }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/components/merchant/payouts/CashOutModal', () => ({
  CashOutModal: () => <div data-testid="cashout-modal">CashOutModal</div>,
}));

jest.mock('@/lib/payoutTokens', () => ({
  getPayoutTokens: () => [],
  findPayoutTokenByAddress: () => null,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('viem', () => ({
  formatUnits: () => '0',
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant payouts route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantPayoutsPage();

    expect(screen.getByRole('heading', { name: /Your Earnings/i })).toBeTruthy();
    expect(screen.getByText(/Connect your merchant wallet/i)).toBeTruthy();
    expect(screen.getByText(/Sign in with the wallet linked to your store/i)).toBeTruthy();
  });
});
